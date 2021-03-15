const QueryQL = require('@truepic/queryql');

class PostQuerier extends QueryQL {
  defineSchema(schema) {
    schema.filter('visibility', '=');
    schema.filter('room_id', '=');
    schema.sort('likes');
    schema.sort('created_at');
    schema.page();
  }

  defineValidation(schema) {
    return {
      'filter:visibility[=]': schema.string().valid('0', '1'),
      'page:size': schema.number().max(100),
      'filter:room_id[=]': schema.number()
    };
  }

  get defaultSort() {
    return {
      created_at: 'desc',
    };
  }
  get defaultPage() {
    return {
      page: 1,
    };
  }
}