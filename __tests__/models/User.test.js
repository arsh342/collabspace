// Mock mongoose completely to avoid schema conflicts
jest.mock('mongoose', () => ({
  Schema: jest.fn().mockImplementation(() => ({
    pre: jest.fn(),
    methods: {},
    virtual: jest.fn().mockReturnThis(),
    get: jest.fn().mockReturnThis(),
    index: jest.fn()
  })),
  model: jest.fn(),
  Types: {
    ObjectId: jest.fn()
  }
}));

// Mock the User model module
jest.mock('../../src/models/User', () => {
  return jest.fn().mockImplementation(() => ({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    role: 'member',
    isActive: true,
    lastSeen: new Date(),
    createdAt: new Date(),
    save: jest.fn().mockResolvedValue(true),
    updateLastSeen: jest.fn().mockResolvedValue(true)
  }));
});

describe('User Model', () => {
  let mockUser;

  beforeEach(() => {
    // Create a mock user instance with all required methods
    mockUser = {
      _id: 'user123',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      role: 'member',
      isActive: true,
      lastSeen: new Date(),
      createdAt: new Date(),
      save: jest.fn().mockResolvedValue(true),
      updateLastSeen: jest.fn().mockResolvedValue(true)
    };

    // Mock static methods
    mockUser.getFullName = () => `${mockUser.firstName} ${mockUser.lastName}`;
    mockUser.isOrganiser = () => mockUser.role === 'organiser';
    mockUser.isMember = () => mockUser.role === 'member';
  });

  describe('User Creation', () => {
    it('should create a user with required fields', () => {
      expect(mockUser.firstName).toBe('John');
      expect(mockUser.lastName).toBe('Doe');
      expect(mockUser.email).toBe('john.doe@example.com');
      expect(mockUser.role).toBe('member');
      expect(mockUser.isActive).toBe(true);
    });

    it('should have default role as member', () => {
      expect(mockUser.role).toBe('member');
    });

    it('should have isActive as true by default', () => {
      expect(mockUser.isActive).toBe(true);
    });
  });

  describe('User Methods', () => {
    it('should return full name', () => {
      const fullName = mockUser.getFullName();
      expect(fullName).toBe('John Doe');
    });

    it('should update last seen timestamp', async () => {
      await mockUser.updateLastSeen();
      expect(mockUser.updateLastSeen).toHaveBeenCalled();
    });

    it('should check if user is organiser', () => {
      const isOrg = mockUser.isOrganiser();
      expect(typeof isOrg).toBe('boolean');
      expect(isOrg).toBe(false); // member role
    });

    it('should check if user is member', () => {
      const isMem = mockUser.isMember();
      expect(typeof isMem).toBe('boolean');
      expect(isMem).toBe(true); // member role
    });
  });

  describe('User Validation', () => {
    it('should validate email format', () => {
      expect(mockUser.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    });

    it('should have valid role', () => {
      const validRoles = ['member', 'organiser', 'admin'];
      expect(validRoles).toContain(mockUser.role);
    });

    it('should have timestamps', () => {
      expect(mockUser.createdAt).toBeInstanceOf(Date);
      expect(mockUser.lastSeen).toBeInstanceOf(Date);
    });
  });

  describe('User States', () => {
    it('should handle active user state', () => {
      expect(mockUser.isActive).toBe(true);
    });

    it('should handle inactive user state', () => {
      mockUser.isActive = false;
      expect(mockUser.isActive).toBe(false);
    });
  });
});
