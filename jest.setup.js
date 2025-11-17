process.env.NODE_ENV = "test";
process.env.TZ = "UTC";

jest.mock("express-session", () => {
  const session = () => (req, res, next) => {
    req.session = req.session || {};
    next();
  };
  session.Session = function Session() {};
  session.Store = class Store {};
  return session;
});

jest.mock("connect-mongo", () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    destroy: jest.fn(),
    touch: jest.fn(),
    length: jest.fn(),
  })),
}));

jest.mock("./src/middleware/logger", () => {
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };
  return {
    loggerMiddleware: (req, res, next) => next(),
    logger: mockLogger,
  };
});

jest.mock("socket.io", () => {
  return jest.fn(() => {
    const io = {
      on: jest.fn(),
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
      close: jest.fn(),
    };
    return io;
  });
});
