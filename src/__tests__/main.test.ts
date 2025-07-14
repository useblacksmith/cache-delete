import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { deleteCache } from "../main";
import fetch, { Response } from "node-fetch";
import { info } from "@actions/core";

jest.mock("node-fetch");
jest.mock("@actions/core", () => ({
  info: jest.fn(),
  setFailed: jest.fn(),
  getInput: jest.fn(),
}));

const mockedFetch = jest.mocked(fetch);
const mockedInfo = jest.mocked(info);

describe("deleteCache", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve({ count: 1 }),
    } as Response);
  });

  const defaultParams = {
    baseUrl: "http://baseurl/",
    cacheToken: "test-token",
  };

  it("should send request to delete a specific cache key", async () => {
    await deleteCache({
      cacheKey: "npm-cache",
      ...defaultParams,
    });

    expect(mockedFetch).toHaveBeenCalledWith(
      "http://baseurl/twirp/github.actions.results.api.v1.CacheService/DeleteCacheEntry",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json; version=6.0-preview.1",
          Authorization: "Bearer test-token",
        },
        body: JSON.stringify({
          key: "npm-cache",
          prefix: false,
        }),
      }
    );
    expect(mockedInfo).toHaveBeenCalledWith(
      "Successfully deleted cache: npm-cache"
    );
    expect(mockedInfo).toHaveBeenCalledWith("Deleted 1 cache entries");
  });

  it("should send request to delete a specific cache version", async () => {
    await deleteCache({
      cacheKey: "npm-cache",
      cacheVersion: "v1.0",
      ...defaultParams,
    });

    expect(mockedFetch).toHaveBeenCalledWith(
      "http://baseurl/twirp/github.actions.results.api.v1.CacheService/DeleteCacheEntry",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json; version=6.0-preview.1",
          Authorization: "Bearer test-token",
        },
        body: JSON.stringify({
          key: "npm-cache",
          version: "v1.0",
          prefix: false,
        }),
      }
    );
    expect(mockedInfo).toHaveBeenCalledWith(
      "Successfully deleted cache version: npm-cache@v1.0"
    );
    expect(mockedInfo).toHaveBeenCalledWith("Deleted 1 cache entries");
  });

  it("should send request with prefix parameter", async () => {
    mockedFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve({ count: 5 }),
    } as Response);

    await deleteCache({
      cacheKey: "npm-",
      prefix: true,
      ...defaultParams,
    });

    expect(mockedFetch).toHaveBeenCalledWith(
      "http://baseurl/twirp/github.actions.results.api.v1.CacheService/DeleteCacheEntry",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json; version=6.0-preview.1",
          Authorization: "Bearer test-token",
        },
        body: JSON.stringify({
          key: "npm-",
          prefix: true,
        }),
      }
    );
    expect(mockedInfo).toHaveBeenCalledWith(
      "Successfully deleted caches with prefix: npm-"
    );
    expect(mockedInfo).toHaveBeenCalledWith("Deleted 5 cache entries");
  });

  it("should send request with empty key and prefix parameter", async () => {
    mockedFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: () => Promise.resolve({ count: 10 }),
    } as Response);

    await deleteCache({
      cacheKey: "",
      prefix: true,
      ...defaultParams,
    });

    expect(mockedFetch).toHaveBeenCalledWith(
      "http://baseurl/twirp/github.actions.results.api.v1.CacheService/DeleteCacheEntry",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json; version=6.0-preview.1",
          Authorization: "Bearer test-token",
        },
        body: JSON.stringify({
          key: "",
          prefix: true,
        }),
      }
    );
    expect(mockedInfo).toHaveBeenCalledWith(
      "Successfully deleted caches with prefix: "
    );
    expect(mockedInfo).toHaveBeenCalledWith("Deleted 10 cache entries");
  });

  it("should fail if key is empty and prefix is not true", async () => {
    await expect(
      deleteCache({
        cacheKey: "",
        prefix: false,
        ...defaultParams,
      })
    ).rejects.toThrow("Cache key cannot be empty unless prefix is true");
  });

  it("should fail if version is specified with prefix", async () => {
    await expect(
      deleteCache({
        cacheKey: "npm-cache",
        cacheVersion: "v1.0",
        prefix: true,
        ...defaultParams,
      })
    ).rejects.toThrow("Cannot specify version when using prefix");
  });

  it("should handle 404 response", async () => {
    mockedFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: () => Promise.resolve({}),
    } as Response);

    await deleteCache({
      cacheKey: "non-existent",
      ...defaultParams,
    });

    expect(mockedInfo).toHaveBeenCalledWith("Cache not found: non-existent");
  });

  it("should throw error for non-404 failure", async () => {
    mockedFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: () => Promise.resolve({}),
    } as Response);

    await expect(
      deleteCache({
        cacheKey: "npm-cache",
        ...defaultParams,
      })
    ).rejects.toThrow("Failed to delete cache: 500 Internal Server Error");
  });

  it("should fail if version is specified with empty key", async () => {
    await expect(
      deleteCache({
        cacheKey: "",
        cacheVersion: "v1.0",
        prefix: true,
        ...defaultParams,
      })
    ).rejects.toThrow("Cannot specify version when using empty key");
  });
});
