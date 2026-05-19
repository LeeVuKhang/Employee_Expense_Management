const request = require('supertest');
const app = require('../src/index'); 

describe('Expense API - Sprint 1 Tests', () => {
    
    // 1. Testing the Locking Logic
    it('Should block edits and return 403 if the request is Approved/Locked', async () => {
        const lockedExpenseId = 1; 
        const response = await request(app)
            .put(`/api/expenses/${lockedExpenseId}`)
            .send({ total_amount: 9999 }); 
        expect(response.statusCode).toBe(403);
    });

    it('Should block cancellations and return 403 if the request is Approved/Locked', async () => {
        const lockedExpenseId = 1; 
        const response = await request(app).delete(`/api/expenses/${lockedExpenseId}`); 
        expect(response.statusCode).toBe(403);
    });

    // 2. Testing the Backend Duplicate Route
    it('Should duplicate the request, returning a new ID', async () => {
        const originalExpenseId = 2; 
        const response = await request(app)
            .post(`/api/expenses/${originalExpenseId}/duplicate`)
            .send({
                new_start_date: '2026-06-01',
                new_end_date: '2026-06-05'
            });
        expect(response.statusCode).toBe(201);
        expect(response.body.new_id).toBeDefined();
        expect(response.body.new_id).not.toBe(originalExpenseId);
    });
});