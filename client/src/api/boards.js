/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import http from './http';
import socket from './socket';
import { transformCard } from './cards';
import { transformAttachment } from './attachments';
import Config from '../constants/Config';

/* Actions */

const createBoard = (projectId, data, headers) =>
  socket.post(`/projects/${projectId}/boards`, data, headers);

const createBoardWithImport = (projectId, data, requestId, headers) =>
  http.post(`/projects/${projectId}/boards?requestId=${requestId}`, data, headers);

const getBoard = (id, subscribe, headers) =>
  socket
    .get(`/boards/${id}${subscribe ? '?subscribe=true' : ''}`, undefined, headers)
    .then((body) => ({
      ...body,
      included: {
        ...body.included,
        cards: body.included.cards.map(transformCard),
        attachments: body.included.attachments.map(transformAttachment),
      },
    }));

const updateBoard = (id, data, headers) => socket.patch(`/boards/${id}`, data, headers);

const deleteBoard = (id, headers) => socket.delete(`/boards/${id}`, undefined, headers);

const exportBoard = (id, headers) => {
  return fetch(`${Config.BASE_PATH}/api/boards/${id}/export`, {
    method: 'GET',
    headers,
    credentials: 'include',
  }).then((response) => {
    if (!response.ok) {
      throw new Error('Export failed');
    }
    return response.json().then((body) => ({
      ...body,
      headers: response.headers,
    }));
  });
};

export default {
  createBoard,
  createBoardWithImport,
  getBoard,
  updateBoard,
  deleteBoard,
  exportBoard,
};
