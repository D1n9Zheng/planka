/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    board: {
      type: 'ref',
      required: true,
    },
  },

  async fn(inputs) {
    const { board } = inputs;

    // Get all lists for the board
    const lists = await List.qm.getByBoardId(board.id);

    // Filter to finite lists (active + closed) for export
    const finiteLists = lists.filter((list) => sails.helpers.lists.isFinite(list));
    const finiteListIds = sails.helpers.utils.mapRecords(finiteLists);

    // Get all cards for these lists
    const cards = await Card.qm.getByListIds(finiteListIds);
    const cardIds = sails.helpers.utils.mapRecords(cards);

    // Get related data
    const cardMemberships = await CardMembership.qm.getByCardIds(cardIds);
    const cardLabels = await CardLabel.qm.getByCardIds(cardIds);
    const taskLists = await TaskList.qm.getByCardIds(cardIds);
    const taskListIds = sails.helpers.utils.mapRecords(taskLists);
    const tasks = await Task.qm.getByTaskListIds(taskListIds);
    const comments = await Comment.qm.getByCardIds(cardIds);
    const labels = await Label.qm.getByBoardId(board.id);

    // Get all users involved
    const userIds = _.uniq([
      ...sails.helpers.utils.mapRecords(cardMemberships, 'userId'),
      ...sails.helpers.utils.mapRecords(comments, 'userId'),
      ...sails.helpers.utils.mapRecords(cards, 'creatorUserId', true, true),
    ]);
    const users = await User.qm.getByIds(userIds);

    // Build lookup maps
    const userById = users.reduce((acc, user) => ({ ...acc, [user.id]: user }), {});
    const labelById = labels.reduce((acc, label) => ({ ...acc, [label.id]: label }), {});
    const listById = finiteLists.reduce((acc, list) => ({ ...acc, [list.id]: list }), {});
    const taskListByCardId = taskLists.reduce((acc, tl) => {
      if (!acc[tl.cardId]) acc[tl.cardId] = [];
      acc[tl.cardId].push(tl);
      return acc;
    }, {});
    const tasksByTaskListId = tasks.reduce((acc, task) => {
      if (!acc[task.taskListId]) acc[task.taskListId] = [];
      acc[task.taskListId].push(task);
      return acc;
    }, {});
    const commentsByCardId = comments.reduce((acc, comment) => {
      if (!acc[comment.cardId]) acc[comment.cardId] = [];
      acc[comment.cardId].push(comment);
      return acc;
    }, {});
    const membershipsByCardId = cardMemberships.reduce((acc, cm) => {
      if (!acc[cm.cardId]) acc[cm.cardId] = [];
      acc[cm.cardId].push(cm);
      return acc;
    }, {});
    const cardLabelsByCardId = cardLabels.reduce((acc, cl) => {
      if (!acc[cl.cardId]) acc[cl.cardId] = [];
      acc[cl.cardId].push(cl);
      return acc;
    }, {});

    // Build exported data
    const exportedLists = finiteLists.map((list) => {
      const listCards = cards.filter((card) => card.listId === list.id);

      const exportedCards = listCards.map((card) => {
        const cardMembershipsList = membershipsByCardId[card.id] || [];
        const cardLabelsList = cardLabelsByCardId[card.id] || [];
        const cardComments = commentsByCardId[card.id] || [];
        const cardTaskLists = taskListByCardId[card.id] || [];

        // Get assignee names
        const assignees = cardMembershipsList
          .map((cm) => userById[cm.userId])
          .filter(Boolean)
          .map((u) => u.username)
          .join(', ');

        // Get label names
        const cardLabelNames = cardLabelsList
          .map((cl) => labelById[cl.labelId])
          .filter(Boolean)
          .map((l) => l.name)
          .join(', ');

        // Get creator
        const creator = card.creatorUserId ? userById[card.creatorUserId]?.username : null;

        // Get tasks for each task list
        const tasksData = cardTaskLists.map((tl) => {
          const tlTasks = tasksByTaskListId[tl.id] || [];
          return {
            name: tl.name,
            tasks: tlTasks.map((t) => ({
              name: t.name,
              isCompleted: t.isCompleted,
            })),
          };
        });

        // Get comments
        const commentsData = cardComments.map((c) => ({
          text: c.text,
          author: userById[c.userId]?.username || 'Unknown',
          createdAt: c.createdAt,
        }));

        return {
          id: card.id,
          name: card.name,
          description: card.description || '',
          status: card.isClosed ? 'Closed' : 'Open',
          dueDate: card.dueDate || null,
          isDueCompleted: card.isDueCompleted || false,
          assignee: assignees || '',
          labels: cardLabelNames || '',
          creator: creator || '',
          tasks: tasksData,
          comments: commentsData,
          createdAt: card.createdAt,
          updatedAt: card.updatedAt,
        };
      });

      return {
        id: list.id,
        name: list.name,
        color: list.color,
        cards: exportedCards,
      };
    });

    return {
      board: {
        id: board.id,
        name: board.name,
      },
      exportedAt: new Date().toISOString(),
      totalCards: cards.length,
      totalLists: finiteLists.length,
      lists: exportedLists,
    };
  },
};
