const redis = require('redis');

class RedisService {
  constructor() {
    this.client = null;
    this.publisher = null;
    this.subscriber = null;
  }

  async connect() {
    try {
      const config = {
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      };

      if (process.env.REDIS_PASSWORD) {
        config.password = process.env.REDIS_PASSWORD;
      }

      this.client = redis.createClient(config);
      this.publisher = this.client.duplicate();
      this.subscriber = this.client.duplicate();

      await this.client.connect();
      await this.publisher.connect();
      await this.subscriber.connect();

      console.log('Redis connected successfully');

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
      });

    } catch (error) {
      console.error('Redis connection failed:', error.message);
    }
  }

  async set(key, value, expireSeconds = null) {
    try {
      const data = JSON.stringify(value);
      if (expireSeconds) {
        await this.client.setEx(key, expireSeconds, data);
      } else {
        await this.client.set(key, data);
      }
      return true;
    } catch (error) {
      console.error('Redis SET error:', error);
      return false;
    }
  }

  async get(key) {
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Redis GET error:', error);
      return null;
    }
  }

  async del(key) {
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Redis DEL error:', error);
      return false;
    }
  }

  async publish(channel, message) {
    try {
      await this.publisher.publish(channel, JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Redis PUBLISH error:', error);
      return false;
    }
  }

  async subscribe(channel, callback) {
    try {
      await this.subscriber.subscribe(channel, (data) => {
        try {
          const message = JSON.parse(data);
          callback(message);
        } catch (parseError) {
          console.error('Error parsing Redis message:', parseError);
        }
      });
    } catch (error) {
      console.error('Redis SUBSCRIBE error:', error);
    }
  }

  async disconnect() {
    try {
      await this.client?.quit();
      await this.publisher?.quit();
      await this.subscriber?.quit();
    } catch (error) {
      console.error('Redis disconnect error:', error);
    }
  }
}

const redisService = new RedisService();

process.on('SIGINT', async () => {
  await redisService.disconnect();
  process.exit(0);
});

module.exports = redisService;