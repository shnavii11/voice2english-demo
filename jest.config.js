module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/(unit|integration)/**/*.test.js'],
  transform: { '^.+\\.[jt]sx?$': 'babel-jest' },
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
};
