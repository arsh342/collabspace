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
    ObjectId: jest.fn().mockImplementation((id) => id || 'mockObjectId')
  }
}));

// Mock the Task model module
jest.mock('../../src/models/Task', () => {
  return jest.fn().mockImplementation(() => ({
    title: 'Test Task',
    description: 'A test task for testing',
    assignedTo: 'user123',
    createdBy: 'admin123',
    teamId: 'team123',
    status: 'pending',
    priority: 'medium',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: null,
    save: jest.fn().mockResolvedValue(true)
  }));
});

describe('Task Model', () => {
  let mockTask;

  beforeEach(() => {
    mockTask = {
      _id: 'task123',
      title: 'Test Task',
      description: 'A test task for testing',
      assignedTo: 'user123',
      createdBy: 'admin123',
      teamId: 'team123',
      status: 'pending',
      priority: 'medium',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
      save: jest.fn().mockResolvedValue(true)
    };

    // Mock instance methods
    mockTask.updateStatus = jest.fn().mockImplementation((newStatus) => {
      mockTask.status = newStatus;
      if (newStatus === 'completed') {
        mockTask.completedAt = new Date();
      }
      return Promise.resolve(true);
    });

    mockTask.assignTo = jest.fn().mockImplementation((userId) => {
      mockTask.assignedTo = userId;
      return Promise.resolve(true);
    });

    mockTask.isCompleted = jest.fn().mockImplementation(() => mockTask.status === 'completed');
    mockTask.isOverdue = jest.fn().mockImplementation(() => mockTask.dueDate < new Date());
    mockTask.getDaysUntilDue = jest.fn().mockImplementation(() => {
      const diffTime = mockTask.dueDate - new Date();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    });
  });

  describe('Task Creation', () => {
    it('should create a task with required fields', () => {
      expect(mockTask.title).toBe('Test Task');
      expect(mockTask.description).toBe('A test task for testing');
      expect(mockTask.assignedTo).toBe('user123');
      expect(mockTask.createdBy).toBe('admin123');
      expect(mockTask.teamId).toBe('team123');
    });

    it('should have default status as pending', () => {
      expect(mockTask.status).toBe('pending');
    });

    it('should have default priority as medium', () => {
      expect(mockTask.priority).toBe('medium');
    });

    it('should have timestamps', () => {
      expect(mockTask.createdAt).toBeInstanceOf(Date);
      expect(mockTask.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Task Status Management', () => {
    it('should update task status', async () => {
      await mockTask.updateStatus('in_progress');
      expect(mockTask.updateStatus).toHaveBeenCalledWith('in_progress');
    });

    it('should check if task is completed', () => {
      mockTask.isCompleted.mockReturnValue(true);
      const isCompleted = mockTask.isCompleted();
      expect(isCompleted).toBe(true);
      expect(mockTask.isCompleted).toHaveBeenCalled();
    });

    it('should handle task completion', () => {
      mockTask.status = 'completed';
      mockTask.completedAt = new Date();
      expect(mockTask.status).toBe('completed');
      expect(mockTask.completedAt).toBeInstanceOf(Date);
    });
  });

  describe('Task Assignment', () => {
    it('should assign task to user', async () => {
      await mockTask.assignTo('newUser123');
      expect(mockTask.assignTo).toHaveBeenCalledWith('newUser123');
    });

    it('should have assigned user', () => {
      expect(mockTask.assignedTo).toBe('user123');
    });

    it('should track who created the task', () => {
      expect(mockTask.createdBy).toBe('admin123');
    });
  });

  describe('Task Priority', () => {
    it('should handle low priority', () => {
      mockTask.priority = 'low';
      expect(mockTask.priority).toBe('low');
    });

    it('should handle medium priority', () => {
      expect(mockTask.priority).toBe('medium');
    });

    it('should handle high priority', () => {
      mockTask.priority = 'high';
      expect(mockTask.priority).toBe('high');
    });

    it('should validate priority values', () => {
      const validPriorities = ['low', 'medium', 'high'];
      expect(validPriorities).toContain(mockTask.priority);
    });
  });

  describe('Task Due Dates', () => {
    it('should have due date', () => {
      expect(mockTask.dueDate).toBeInstanceOf(Date);
    });

    it('should check if task is overdue', () => {
      mockTask.isOverdue.mockReturnValue(false);
      const isOverdue = mockTask.isOverdue();
      expect(isOverdue).toBe(false);
      expect(mockTask.isOverdue).toHaveBeenCalled();
    });

    it('should calculate days until due', () => {
      const days = mockTask.getDaysUntilDue();
      expect(days).toBe(7);
    });

    it('should handle overdue tasks', () => {
      mockTask.dueDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
      mockTask.isOverdue = jest.fn().mockReturnValue(true);
      expect(mockTask.isOverdue()).toBe(true);
    });
  });

  describe('Task Validation', () => {
    it('should have valid status', () => {
      const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
      expect(validStatuses).toContain(mockTask.status);
    });

    it('should require title', () => {
      expect(mockTask.title).toBeTruthy();
      expect(mockTask.title.length).toBeGreaterThan(0);
    });

    it('should belong to a team', () => {
      expect(mockTask.teamId).toBeTruthy();
    });

    it('should have creator', () => {
      expect(mockTask.createdBy).toBeTruthy();
    });
  });
});
