import request from 'supertest';
import { app } from '../../api/server';

describe('SOS API', () => {
  it('creates an SOS event', async () => {
    const token = 'mock-jwt';
    const res = await request(app)
      .post('/api/sos')
      .set('Authorization', `Bearer ${token}`)
      .send({ lat: 33.95, lng: -84.55 });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ status: 'created' });
  });
});

