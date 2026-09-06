import { jest } from '@jest/globals';

const mockService = {
    submitChallenge: jest.fn(),
    getMyChallenges: jest.fn(),
    getChallengeById: jest.fn(),
    getOpenChallenges: jest.fn(),
    adminAssignChallenge: jest.fn(),
};

jest.unstable_mockModule('../services/challenge.service.js', () => ({
    default: jest.fn(() => mockService),
}));

const { submitChallenge, getMyChallenges, getChallengeById, listOpenChallenges, assignChallenge } =
    await import('../controllers/challenge.controller.js');

const makeRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

const makeReq = (overrides = {}) => ({
    user: { id: 'user-123', role: 'USER' },
    body: {},
    params: {},
    files: {},
    ...overrides,
});

const next = jest.fn();

beforeEach(() => jest.clearAllMocks());

// ── submitChallenge ───────────────────────────────────────────────────────────

describe('submitChallenge', () => {
    it('returns 201 with challenge data on success', async () => {
        mockService.submitChallenge.mockResolvedValue({
            challenge: { id: 'ch-1', title: 'Fix the road' },
            warning: null,
        });

        const req = makeReq({
            body: { title: 'Fix the road', description: 'Big pothole' },
            files: { image: [{ buffer: Buffer.from('img') }] },
        });
        const res = makeRes();

        await submitChallenge(req, res, next);

        expect(mockService.submitChallenge).toHaveBeenCalledWith('user-123', {
            title: 'Fix the road',
            description: 'Big pothole',
            imageFile: req.files.image[0],
            audioFile: undefined,
        });
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            message: 'Challenge submitted successfully',
            data: { id: 'ch-1', title: 'Fix the road' },
            warning: null,
        });
        expect(next).not.toHaveBeenCalled();
    });

    it('calls next with error when service throws', async () => {
        const err = new Error('ML service down');
        mockService.submitChallenge.mockRejectedValue(err);

        await submitChallenge(makeReq({ body: { title: 'Test' } }), makeRes(), next);

        expect(next).toHaveBeenCalledWith(err);
    });

    it('works when no files are attached', async () => {
        mockService.submitChallenge.mockResolvedValue({
            challenge: { id: 'ch-2' },
            warning: null,
        });

        const req = makeReq({ body: { title: 'No media' }, files: {} });
        const res = makeRes();

        await submitChallenge(req, res, next);

        expect(mockService.submitChallenge).toHaveBeenCalledWith('user-123', {
            title: 'No media',
            description: undefined,
            imageFile: undefined,
            audioFile: undefined,
        });
    });

    it('includes warning in response when service returns one', async () => {
        mockService.submitChallenge.mockResolvedValue({
            challenge: { id: 'ch-3' },
            warning: 'Media upload failed',
        });

        const res = makeRes();
        await submitChallenge(makeReq({ body: { title: 'Test' } }), res, next);

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ warning: 'Media upload failed' })
        );
    });
});

// ── getMyChallenges ───────────────────────────────────────────────────────────

describe('getMyChallenges', () => {
    it('returns 200 with challenges array', async () => {
        const fakeChallenges = [{ id: 'ch-1' }, { id: 'ch-2' }];
        mockService.getMyChallenges.mockResolvedValue(fakeChallenges);

        const res = makeRes();
        await getMyChallenges(makeReq(), res, next);

        expect(mockService.getMyChallenges).toHaveBeenCalledWith('user-123');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            message: 'Challenges fetched successfully',
            data: fakeChallenges,
        });
    });

    it('returns empty array when user has no challenges', async () => {
        mockService.getMyChallenges.mockResolvedValue([]);

        const res = makeRes();
        await getMyChallenges(makeReq(), res, next);

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: [] }));
    });

    it('calls next with error when service throws', async () => {
        mockService.getMyChallenges.mockRejectedValue(new Error('DB error'));

        await getMyChallenges(makeReq(), makeRes(), next);

        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
});

// ── getChallengeById ──────────────────────────────────────────────────────────

describe('getChallengeById', () => {
    it('returns 200 for the owner', async () => {
        mockService.getChallengeById.mockResolvedValue({
            id: 'ch-1',
            userId: 'user-123',
            assignments: [],
        });

        const res = makeRes();
        await getChallengeById(makeReq({ params: { id: 'ch-1' } }), res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: true, message: 'Challenge fetched successfully' })
        );
    });

    it('returns 200 for an ADMIN', async () => {
        mockService.getChallengeById.mockResolvedValue({
            id: 'ch-1',
            userId: 'someone-else',
            assignments: [],
        });

        const req = makeReq({ user: { id: 'admin-1', role: 'ADMIN' }, params: { id: 'ch-1' } });
        const res = makeRes();

        await getChallengeById(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('returns 200 for assigned org with ACCEPTED status', async () => {
        mockService.getChallengeById.mockResolvedValue({
            id: 'ch-1',
            userId: 'someone-else',
            assignments: [{ status: 'ACCEPTED', organization: { userId: 'org-user-1' } }],
        });

        const req = makeReq({
            user: { id: 'org-user-1', role: 'ORGANIZATION' },
            params: { id: 'ch-1' },
        });
        const res = makeRes();

        await getChallengeById(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('returns 200 for assigned org with PENDING status', async () => {
        mockService.getChallengeById.mockResolvedValue({
            id: 'ch-1',
            userId: 'someone-else',
            assignments: [{ status: 'PENDING', organization: { userId: 'org-user-2' } }],
        });

        const req = makeReq({
            user: { id: 'org-user-2', role: 'ORGANIZATION' },
            params: { id: 'ch-1' },
        });
        const res = makeRes();

        await getChallengeById(req, res, next);

        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('calls next with 404 when challenge is not found', async () => {
        mockService.getChallengeById.mockResolvedValue(null);

        await getChallengeById(makeReq({ params: { id: 'ghost' } }), makeRes(), next);

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'Challenge not found', statusCode: 404 })
        );
    });

    it('calls next with 404 when user has no access', async () => {
        mockService.getChallengeById.mockResolvedValue({
            id: 'ch-1',
            userId: 'someone-else',
            assignments: [],
        });

        const req = makeReq({ user: { id: 'random', role: 'USER' }, params: { id: 'ch-1' } });

        await getChallengeById(req, makeRes(), next);

        expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
    });

    it('calls next with error when service throws', async () => {
        mockService.getChallengeById.mockRejectedValue(new Error('DB error'));

        await getChallengeById(makeReq({ params: { id: 'ch-1' } }), makeRes(), next);

        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
});

// ── listOpenChallenges ────────────────────────────────────────────────────────

describe('listOpenChallenges', () => {
    it('returns 200 with open challenges', async () => {
        mockService.getOpenChallenges.mockResolvedValue([{ id: 'ch-open-1' }]);

        const res = makeRes();
        await listOpenChallenges(makeReq(), res, next);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            message: 'Open challenges fetched successfully',
            data: [{ id: 'ch-open-1' }],
        });
    });

    it('returns empty array when no open challenges exist', async () => {
        mockService.getOpenChallenges.mockResolvedValue([]);

        const res = makeRes();
        await listOpenChallenges(makeReq(), res, next);

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: [] }));
    });

    it('calls next on service error', async () => {
        mockService.getOpenChallenges.mockRejectedValue(new Error('fail'));

        await listOpenChallenges(makeReq(), makeRes(), next);

        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
});

// ── assignChallenge ───────────────────────────────────────────────────────────

describe('assignChallenge', () => {
    it('returns 201 with assignment on success', async () => {
        const fakeAssignment = { id: 'assign-1', challengeId: 'ch-1' };
        mockService.adminAssignChallenge.mockResolvedValue(fakeAssignment);

        const req = makeReq({
            params: { id: 'ch-1' },
            body: { organizationId: 'org-1', remarks: 'Urgent' },
        });
        const res = makeRes();

        await assignChallenge(req, res, next);

        expect(mockService.adminAssignChallenge).toHaveBeenCalledWith('ch-1', 'org-1', 'Urgent');
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
            success: true,
            message: 'Challenge assigned successfully',
            data: fakeAssignment,
        });
    });

    it('works without remarks (optional field)', async () => {
        mockService.adminAssignChallenge.mockResolvedValue({ id: 'assign-2' });

        const req = makeReq({
            params: { id: 'ch-1' },
            body: { organizationId: 'org-1' },
        });

        await assignChallenge(req, makeRes(), next);

        expect(mockService.adminAssignChallenge).toHaveBeenCalledWith('ch-1', 'org-1', undefined);
    });

    it('calls next with 400 when organizationId is missing', async () => {
        const req = makeReq({ params: { id: 'ch-1' }, body: {} });

        await assignChallenge(req, makeRes(), next);

        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'organizationId is required', statusCode: 400 })
        );
        expect(mockService.adminAssignChallenge).not.toHaveBeenCalled();
    });

    it('calls next when service throws', async () => {
        mockService.adminAssignChallenge.mockRejectedValue(new Error('DB error'));

        const req = makeReq({ params: { id: 'ch-1' }, body: { organizationId: 'org-1' } });

        await assignChallenge(req, makeRes(), next);

        expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
});
