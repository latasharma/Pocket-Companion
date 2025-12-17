import request from 'supertest';
import { app } from '../../api/server'; // adjust to your entry

describe('Auth API', () => {
  it('signs up a user', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'test@example.com', password: 'Password123!' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('userId');
  });

  it('rejects invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'bad@example.com', password: '123' });
    expect(res.status).toBe(400);
  });
});

