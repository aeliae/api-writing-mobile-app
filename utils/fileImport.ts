import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';

export const MAX_FILE_SIZE = 500 * 1024; // 500 KB

const SUPPORTED_EXTENSIONS = [
  '.txt',
  '.md',
  '.markdown',
  '.json',
  '.csv',
  '.yaml',
  '.yml',
  '.html',
];

export interface ImportedFile {
  name: string;
  mimeType: string;
  size: number;
  content: string;
}

export async function pickAndReadFile(): Promise<ImportedFile | null> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      multiple: false,
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      return null;
    }

    const file = result.assets[0];
    const fileSize = file.size || 0;

    if (!isSupportedFile(file.name)) {
      throw new UnsupportedFileTypeError(
        `"${file.name}" is not supported yet. Please import .txt, .md, .json, .csv, .yaml, or .html files.`
      );
    }

    if (fileSize > MAX_FILE_SIZE) {
      throw new FileSizeLimitError(
        `"${file.name}" is ${formatFileSize(fileSize)} — files over 500 KB are not supported in this version.`
      );
    }

    const pickedFile = new File(file.uri);
    const content = await pickedFile.text();

    if (!content.trim()) {
      throw new Error(`"${file.name}" appears to be empty or could not be read as text.`);
    }

    return {
      name: file.name,
      mimeType: file.mimeType || getMimeTypeFromExtension(file.name),
      size: fileSize || content.length,
      content,
    };
  } catch (error) {
    console.error('Error picking file:', error);
    throw error;
  }
}

export class FileSizeLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileSizeLimitError';
  }
}

export class UnsupportedFileTypeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedFileTypeError';
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function isSupportedFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return SUPPORTED_EXTENSIONS.some(ext => lower.endsWith(ext));
}

export function getMimeTypeFromExtension(filename: string): string {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  const mimeTypes: Record<string, string> = {
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.markdown': 'text/markdown',
    '.json': 'application/json',
    '.csv': 'text/csv',
    '.yaml': 'application/x-yaml',
    '.yml': 'application/x-yaml',
    '.html': 'text/html',
  };
  return mimeTypes[ext] || 'text/plain';
}

    const file = result.assets[0];
    const fileSize = file.size || 0;

    if (fileSize > MAX_FILE_SIZE) {
      throw new FileSizeLimitError(
        `"${file.name}" is ${formatFileSize(fileSize)} — files over 500 KB are not supported in this version.`
      );
    }

    const content = await FileSystem.readAsStringAsync(file.uri);

    return {
      name: file.name,
      mimeType: file.mimeType || 'text/plain',
      size: fileSize || content.length,
      content,
    };
  } catch (error) {
    if (error instanceof FileSizeLimitError) throw error;
    console.error('Error picking file:', error);
    return null;
  }
}

export class FileSizeLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileSizeLimitError';
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function getMimeTypeFromExtension(filename: string): string {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  const mimeTypes: Record<string, string> = {
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.json': 'application/json',
    '.csv': 'text/csv',
    '.yaml': 'application/x-yaml',
    '.yml': 'application/x-yaml',
    '.html': 'text/html',
    '.py': 'text/plain',
    '.js': 'text/javascript',
    '.ts': 'text/typescript',
    '.jsx': 'text/jsx',
    '.tsx': 'text/tsx',
    '.sql': 'text/sql',
    '.xml': 'text/xml',
  };
  return mimeTypes[ext] || 'text/plain';
}
