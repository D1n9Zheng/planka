/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * @swagger
 * /boards/{id}/export:
 *   get:
 *     summary: Export board data
 *     description: Exports all cards and related data from a board in JSON format for archival purposes.
 *     tags:
 *       - Boards
 *     operationId: exportBoard
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID of the board to export
 *         schema:
 *           type: string
 *           example: "1357158568008091264"
 *     responses:
 *       200:
 *         description: Board data exported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 board:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                 exportedAt:
 *                   type: string
 *                   format: date-time
 *                 totalCards:
 *                   type: number
 *                 totalLists:
 *                   type: number
 *                 lists:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       color:
 *                         type: string
 *                       cards:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             name:
 *                               type: string
 *                             description:
 *                               type: string
 *                             status:
 *                               type: string
 *                               enum: [Open, Closed]
 *                             dueDate:
 *                               type: string
 *                               format: date-time
 *                               nullable: true
 *                             isDueCompleted:
 *                               type: boolean
 *                             assignee:
 *                               type: string
 *                             labels:
 *                               type: string
 *                             creator:
 *                               type: string
 *                             tasks:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   name:
 *                                     type: string
 *                                   tasks:
 *                                     type: array
 *                                     items:
 *                                       type: object
 *                                       properties:
 *                                         name:
 *                                           type: string
 *                                         isCompleted:
 *                                           type: boolean
 *                             comments:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   text:
 *                                     type: string
 *                                   author:
 *                                     type: string
 *                                   createdAt:
 *                                     type: string
 *                                     format: date-time
 *                             createdAt:
 *                               type: string
 *                               format: date-time
 *                             updatedAt:
 *                               type: string
 *                               format: date-time
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
  BOARD_NOT_FOUND: {
    boardNotFound: 'Board not found',
  },
};

module.exports = {
  inputs: {
    id: {
      ...idInput,
      required: true,
    },
  },

  exits: {
    boardNotFound: {
      responseType: 'notFound',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    const { board, project } = await sails.helpers.boards
      .getPathToProjectById(inputs.id)
      .intercept('pathNotFound', () => Errors.BOARD_NOT_FOUND);

    if (currentUser.role !== User.Roles.ADMIN || project.ownerProjectManagerId) {
      const isProjectManager = await sails.helpers.users.isProjectManager(
        currentUser.id,
        project.id,
      );

      if (!isProjectManager) {
        const boardMembership = await BoardMembership.qm.getOneByBoardIdAndUserId(
          board.id,
          currentUser.id,
        );

        if (!boardMembership) {
          throw Errors.BOARD_NOT_FOUND; // Forbidden
        }
      }
    }

    const exportData = await sails.helpers.boards.exportOne(board);

    // Set response headers for file download
    const filename = `board-export-${board.name.replace(/[^a-z0-9]/gi, '-')}-${Date.now()}.json`;
    this.res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    this.res.setHeader('Content-Type', 'application/json');

    return exportData;
  },
};
