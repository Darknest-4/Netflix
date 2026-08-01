/**
 * Jest configuration for the API workspace.
 *
 * Only the domain and application layers are unit tested here: they hold the
 * business rules and have no framework dependencies, which makes them fast and
 * meaningful to test in isolation. HTTP behaviour is covered by the e2e suite.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  moduleFileExtensions: ['js', 'json', 'ts'],
  collectCoverageFrom: ['**/domain/**/*.ts', '**/application/**/*.ts'],
  coverageDirectory: '../coverage',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/../tsconfig.json' }],
  },
};
