const express = require('express');
const app = express.Router();
const Room = require('../models/room-model');
const knex = require('../database/dbConfig');

const QueryQL = require('@truepic/queryql');

class PostQuerier extends QueryQL {
  defineSchema(schema) {
    schema.filter('posts.visible', '=');
    schema.filter('rooms_to_posts.room_id', '=');
    schema.sort('posts.likes');
    schema.sort('posts.created_at');
    schema.page(true);
  }

  defineValidation(schema) {
    return {
      'filter:visibility[=]': schema.number().valid(0, 1),
      'page:size': schema.number().max(100),
      'filter:room_id[=]': schema.number()
    };
  }

  get sortDefaults() {
    return {
      order: 'desc',
    };
  }
  get defaultPage() {
    return 1;
  }

  get pageDefaults() {
    return {
      number: 1,
      size: 10,
    };
  }
}

// Get all rooms
app.get('/', (req, res) => {
  Room.getAllRooms()
    .then((rooms) => {
      res.status(200).json(rooms);
    })
    .catch(() => {
      res.status(500).json({ message: 'Could not retrieve rooms' });
    });
});

// Create a room
app.post('/', (req, res) => {
  const { role_id } = req.user;
  const { room_name, description } = req.body;
  if (role_id !== 3) {
    res.status(403).json({ message: 'Access denied.' });
  } else if (!room_name || !description) {
    res.status(400).json({ message: 'Must designate room name to continue.' });
  } else {
    Room.add(req.body)
      .then((data) => {
        res.status(201).json(data);
      })
      .catch((err) => {
        res.status(500).json({ message: err.message });
      });
  }
});

// Delete a room
app.delete('/:id', (req, res) => {
  const { role_id } = req.user;
  const roomId = req.params.id;
  if (role_id != 3) {
    res.status(403).json({ message: 'Access denied.' });
  } else {
    Room.remove(roomId)
      .then(() => {
        res.status(200).json({ message: `room ${roomId} has been removed from DB` });
      })
      .catch((err) => {
        res.status(500).json({ message: err.message });
      });
  }
});

// Fetch posts in a room based on query
app.get('/posts', async (req, res) => {
  const querier = new PostQuerier(
    req.query, 
    knex('posts')
      .join('users', 'posts.user_id', 'users.id')
      .join('rooms_to_posts', 'posts.id', 'rooms_to_posts.post_id')
  );
  try {
    const posts = await querier.run();
    const count = await knex('posts')
      .join('users', 'posts.user_id', 'users.id')
      .join('rooms_to_posts', 'posts.id', 'rooms_to_posts.post_id')
      .where('rooms_to_posts.room_id', Number(req.query.filter['rooms_to_posts.room_id']))
      .andWhere('posts.visible', 1)
      .count('posts.id');
    res.status(200).json({
      posts: posts,
      totalPages: Math.ceil(count[0].count / (req.query.page ? req.query.page.size || 10 : 10))
    });
  } catch (error) {
    res.status(400).json({ message: 'Did not provide the proper query requirements', err: error.message});
  }
});

// Fetch posts from room based on user search input
app.get('/:id/search', (request, response) => {
  Room.searchWithRoomId(request.params.id)
    .then((data) => response.status(200).json(data))
    .catch(() =>
      response.status(400).json({
        message: `Failed to fetch all posts for room with ID:${request.params.id}`,
      })
    );
});

module.exports = app;
