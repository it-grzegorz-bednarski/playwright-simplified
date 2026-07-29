import { expect, test } from '@playwright/test';
import { extractBearerAuthHeader } from '@utils/requestAuth';

test.describe('requestAuth helpers', { tag: ['@testBrand', '@sessionManager'] }, () => {
  test.describe('extractBearerAuthHeader', () => {
    test('throws error if authorization header is missing', async () => {
      const mockRequest = {
        headers: () => ({}),
      };

      const mockPromise = Promise.resolve(mockRequest as any);

      await expect(extractBearerAuthHeader(mockPromise)).rejects.toThrow(
        'Missing Authorization Bearer header'
      );
    });

    test('throws error if bearer prefix is missing', async () => {
      const mockRequest = {
        headers: () => ({ authorization: 'Basic dXNlcjpwYXNz' }),
      };

      const mockPromise = Promise.resolve(mockRequest as any);

      await expect(extractBearerAuthHeader(mockPromise)).rejects.toThrow(
        'Missing Authorization Bearer header'
      );
    });

    test('extracts bearer token successfully', async () => {
      const token = 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9';
      const mockRequest = {
        headers: () => ({ authorization: token }),
      };

      const mockPromise = Promise.resolve(mockRequest as any);

      const result = await extractBearerAuthHeader(mockPromise);

      expect(result).toBe(token);
    });

    test('handles case-insensitive header lookup', async () => {
      const token = 'Bearer test-token-123';
      const mockRequest = {
        headers: () => ({ authorization: token }),
      };

      const mockPromise = Promise.resolve(mockRequest as any);

      const result = await extractBearerAuthHeader(mockPromise);

      expect(result).toBe(token);
    });
  });
});
