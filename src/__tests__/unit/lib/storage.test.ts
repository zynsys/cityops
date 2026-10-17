import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the Node fs layer (local provider) and the Azure SDK (azure provider) so the
// upload/delete logic is exercised without touching disk or a real storage account.
const fsMocks = vi.hoisted(() => ({
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  unlink: vi.fn(),
}));
vi.mock('fs/promises', () => ({ ...fsMocks, default: fsMocks }));

const azure = vi.hoisted(() => {
  const uploadData = vi.fn();
  const deleteIfExists = vi.fn();
  const download = vi.fn();
  const getBlockBlobClient = vi.fn((blobName: string) => ({
    url: `https://stcityopstest.blob.core.windows.net/report-attachments/${blobName}`,
    uploadData,
    deleteIfExists,
    download,
  }));
  const getContainerClient = vi.fn((name: string) => ({
    containerName: name,
    getBlockBlobClient,
  }));
  const fromConnectionString = vi.fn(() => ({ getContainerClient }));
  const constructed = vi.fn();
  class BlobServiceClient {
    static fromConnectionString = fromConnectionString;
    getContainerClient = getContainerClient;
    constructor(url: string, credential: unknown) {
      constructed(url, credential);
    }
  }
  return {
    uploadData,
    deleteIfExists,
    download,
    getBlockBlobClient,
    getContainerClient,
    fromConnectionString,
    constructed,
    BlobServiceClient,
  };
});
vi.mock('@azure/storage-blob', () => ({ BlobServiceClient: azure.BlobServiceClient }));
vi.mock('@azure/identity', () => ({
  DefaultAzureCredential: class {
    readonly kind = 'default-credential';
  },
}));

import { uploadAttachment, deleteAttachment, readAttachment, isValidAttachmentName } from '@/lib/storage';

const BLOB_NAME = '42/0f8fad5b-d9cb-469f-a165-70867728950e.jpg';

const OLD_ENV = process.env;

function makeFile(name = 'photo.jpg', type = 'image/jpeg'): File {
  return new File([new Uint8Array([1, 2, 3, 4])], name, { type });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env = { ...OLD_ENV };
});

afterEach(() => {
  process.env = OLD_ENV;
});

describe('uploadAttachment — local provider', () => {
  it('writes to public/uploads/{reportId}/ and returns the relative path', async () => {
    process.env.STORAGE_PROVIDER = 'local';

    const result = await uploadAttachment(makeFile(), 42, 'abc.jpg');

    expect(fsMocks.mkdir).toHaveBeenCalledTimes(1);
    expect(fsMocks.writeFile).toHaveBeenCalledTimes(1);
    expect(result.storagePath).toBe('/uploads/42/abc.jpg');
    expect(azure.fromConnectionString).not.toHaveBeenCalled();
  });

  it('defaults to local when STORAGE_PROVIDER is unset', async () => {
    delete process.env.STORAGE_PROVIDER;

    const result = await uploadAttachment(makeFile(), 7, 'x.png');

    expect(result.storagePath).toBe('/uploads/7/x.png');
    expect(fsMocks.writeFile).toHaveBeenCalledTimes(1);
  });
});

describe('uploadAttachment — azure provider', () => {
  beforeEach(() => {
    process.env.STORAGE_PROVIDER = 'azure';
    process.env.AZURE_STORAGE_CONNECTION_STRING = 'conn-string';
    process.env.AZURE_STORAGE_CONTAINER = 'report-attachments';
  });

  it("uploads to {reportId}/{storageName} with the file's content type and returns the app path", async () => {
    const result = await uploadAttachment(makeFile('p.jpg', 'image/jpeg'), 42, 'abc.jpg');

    expect(azure.fromConnectionString).toHaveBeenCalledWith('conn-string');
    expect(azure.getContainerClient).toHaveBeenCalledWith('report-attachments');
    expect(azure.getBlockBlobClient).toHaveBeenCalledWith('42/abc.jpg');
    expect(azure.uploadData).toHaveBeenCalledWith(expect.any(Buffer), {
      blobHTTPHeaders: { blobContentType: 'image/jpeg' },
    });
    expect(result.storagePath).toBe('/uploads/42/abc.jpg');
    expect(fsMocks.writeFile).not.toHaveBeenCalled();
  });

  it('uses the managed identity when only AZURE_STORAGE_ACCOUNT_URL is set', async () => {
    delete process.env.AZURE_STORAGE_CONNECTION_STRING;
    process.env.AZURE_STORAGE_ACCOUNT_URL = 'https://stcityopstest.blob.core.windows.net/';

    await uploadAttachment(makeFile(), 42, 'abc.jpg');

    expect(azure.fromConnectionString).not.toHaveBeenCalled();
    expect(azure.constructed).toHaveBeenCalledWith(
      'https://stcityopstest.blob.core.windows.net/',
      expect.objectContaining({ kind: 'default-credential' }),
    );
    expect(azure.getBlockBlobClient).toHaveBeenCalledWith('42/abc.jpg');
  });

  it('throws a clear error when required env vars are missing', async () => {
    delete process.env.AZURE_STORAGE_CONNECTION_STRING;
    delete process.env.AZURE_STORAGE_ACCOUNT_URL;

    await expect(uploadAttachment(makeFile(), 1, 'a.jpg')).rejects.toThrow(
      /AZURE_STORAGE_CONTAINER and either AZURE_STORAGE_ACCOUNT_URL or AZURE_STORAGE_CONNECTION_STRING/,
    );
  });
});

describe('deleteAttachment — local provider', () => {
  it('unlinks the mapped file on disk', async () => {
    process.env.STORAGE_PROVIDER = 'local';
    fsMocks.unlink.mockResolvedValueOnce(undefined);

    await deleteAttachment('/uploads/42/abc.jpg');

    expect(fsMocks.unlink).toHaveBeenCalledTimes(1);
  });

  it('ignores a missing file (ENOENT) so deletes stay idempotent', async () => {
    process.env.STORAGE_PROVIDER = 'local';
    fsMocks.unlink.mockRejectedValueOnce(Object.assign(new Error('gone'), { code: 'ENOENT' }));

    await expect(deleteAttachment('/uploads/42/abc.jpg')).resolves.toBeUndefined();
  });

  it('rethrows non-ENOENT filesystem errors', async () => {
    process.env.STORAGE_PROVIDER = 'local';
    fsMocks.unlink.mockRejectedValueOnce(Object.assign(new Error('denied'), { code: 'EACCES' }));

    await expect(deleteAttachment('/uploads/42/abc.jpg')).rejects.toThrow('denied');
  });
});

describe('deleteAttachment — azure provider', () => {
  beforeEach(() => {
    process.env.STORAGE_PROVIDER = 'azure';
    process.env.AZURE_STORAGE_CONNECTION_STRING = 'conn-string';
    process.env.AZURE_STORAGE_CONTAINER = 'report-attachments';
  });

  it('deletes the blob for an app-relative /uploads path', async () => {
    await deleteAttachment('/uploads/42/abc.jpg');

    expect(azure.getBlockBlobClient).toHaveBeenCalledWith('42/abc.jpg');
    expect(azure.deleteIfExists).toHaveBeenCalledTimes(1);
  });

  it('parses the blob name from a legacy stored URL and deletes it', async () => {
    await deleteAttachment('https://stcityopstest.blob.core.windows.net/report-attachments/42/abc.jpg');

    expect(azure.getBlockBlobClient).toHaveBeenCalledWith('42/abc.jpg');
    expect(azure.deleteIfExists).toHaveBeenCalledTimes(1);
  });

  it('decodes percent-encoded blob names', async () => {
    await deleteAttachment('https://stcityopstest.blob.core.windows.net/report-attachments/42/a%20b.jpg');

    expect(azure.getBlockBlobClient).toHaveBeenCalledWith('42/a b.jpg');
  });
});

describe('readAttachment', () => {
  beforeEach(() => {
    process.env.STORAGE_PROVIDER = 'azure';
    process.env.AZURE_STORAGE_CONNECTION_STRING = 'conn-string';
    process.env.AZURE_STORAGE_CONTAINER = 'report-attachments';
  });

  it('accepts only {reportId|avatars}/{uuid}.{ext} names', () => {
    expect(isValidAttachmentName(BLOB_NAME)).toBe(true);
    expect(isValidAttachmentName('avatars/0f8fad5b-d9cb-469f-a165-70867728950e.png')).toBe(true);
    expect(isValidAttachmentName('../42/0f8fad5b-d9cb-469f-a165-70867728950e.jpg')).toBe(false);
    expect(isValidAttachmentName('42/abc.jpg')).toBe(false);
    expect(isValidAttachmentName('other/0f8fad5b-d9cb-469f-a165-70867728950e.jpg')).toBe(false);
  });

  it('returns null without calling storage for an invalid name', async () => {
    await expect(readAttachment('../secrets.txt')).resolves.toBeNull();
    expect(azure.getBlockBlobClient).not.toHaveBeenCalled();
  });

  it('returns the blob stream and metadata', async () => {
    const body = { pipe: vi.fn() };
    azure.download.mockResolvedValueOnce({ readableStreamBody: body, contentType: 'image/jpeg', contentLength: 4 });

    await expect(readAttachment(BLOB_NAME)).resolves.toEqual({ body, contentType: 'image/jpeg', contentLength: 4 });
    expect(azure.getBlockBlobClient).toHaveBeenCalledWith(BLOB_NAME);
  });

  it('returns null when the blob does not exist', async () => {
    azure.download.mockRejectedValueOnce(Object.assign(new Error('missing'), { statusCode: 404 }));

    await expect(readAttachment(BLOB_NAME)).resolves.toBeNull();
  });

  it('rethrows other storage errors', async () => {
    azure.download.mockRejectedValueOnce(Object.assign(new Error('forbidden'), { statusCode: 403 }));

    await expect(readAttachment(BLOB_NAME)).rejects.toThrow('forbidden');
  });
});