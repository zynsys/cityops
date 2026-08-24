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
  const getBlockBlobClient = vi.fn((blobName: string) => ({
    url: `https://stcityopstest.blob.core.windows.net/report-attachments/${blobName}`,
    uploadData,
    deleteIfExists,
  }));
  const getContainerClient = vi.fn((name: string) => ({
    containerName: name,
    getBlockBlobClient,
  }));
  const fromConnectionString = vi.fn(() => ({ getContainerClient }));
  return { uploadData, deleteIfExists, getBlockBlobClient, getContainerClient, fromConnectionString };
});
vi.mock('@azure/storage-blob', () => ({
  BlobServiceClient: { fromConnectionString: azure.fromConnectionString },
}));

import { uploadAttachment, deleteAttachment } from '@/lib/storage';

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

  it("uploads to {reportId}/{storageName} with the file's content type and returns the blob URL", async () => {
    const result = await uploadAttachment(makeFile('p.jpg', 'image/jpeg'), 42, 'abc.jpg');

    expect(azure.fromConnectionString).toHaveBeenCalledWith('conn-string');
    expect(azure.getContainerClient).toHaveBeenCalledWith('report-attachments');
    expect(azure.getBlockBlobClient).toHaveBeenCalledWith('42/abc.jpg');
    expect(azure.uploadData).toHaveBeenCalledWith(expect.any(Buffer), {
      blobHTTPHeaders: { blobContentType: 'image/jpeg' },
    });
    expect(result.storagePath).toBe('https://stcityopstest.blob.core.windows.net/report-attachments/42/abc.jpg');
    expect(fsMocks.writeFile).not.toHaveBeenCalled();
  });

  it('throws a clear error when required env vars are missing', async () => {
    delete process.env.AZURE_STORAGE_CONNECTION_STRING;

    await expect(uploadAttachment(makeFile(), 1, 'a.jpg')).rejects.toThrow(
      /AZURE_STORAGE_CONNECTION_STRING and AZURE_STORAGE_CONTAINER/,
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

  it('parses the blob name from the stored URL and deletes it', async () => {
    await deleteAttachment('https://stcityopstest.blob.core.windows.net/report-attachments/42/abc.jpg');

    expect(azure.getBlockBlobClient).toHaveBeenCalledWith('42/abc.jpg');
    expect(azure.deleteIfExists).toHaveBeenCalledTimes(1);
  });

  it('decodes percent-encoded blob names', async () => {
    await deleteAttachment('https://stcityopstest.blob.core.windows.net/report-attachments/42/a%20b.jpg');

    expect(azure.getBlockBlobClient).toHaveBeenCalledWith('42/a b.jpg');
  });
});
