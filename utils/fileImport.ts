import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

export const SUPPORTED_MIME_TYPES = [
  'text/plain',
  'text/markdown',
  'application/json',
  'text/csv',
  'application/x-yaml',
  'text/html',
];

export const SUPPORTED_EXTENSIONS = [
  '.txt',
  '.md',
  '.json',
  '.csv',
  '.yaml',
  '.yml',
  '.html',
  '.py',
  '.js',
  '.ts',
  '.jsx',
  '.tsx',
  '.sql',
  '.xml',
];

interface ImportedFile {
  name: string;
  mimeType: string;
  size: number;
  content: string;
}

export async function pickAndReadFile(): Promise<ImportedFile | null> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: SUPPORTED_MIME_TYPES,
      multiple: false,
    });

    if (result.canceled) {
      return null;
    }

    const file = result.assets[0];

    // Read file content
    const content = await FileSystem.readAsStringAsync(file.uri);

    // Check file size (warn if > 100KB)
    if (file.size && file.size > 100000) {
      console.warn(`File is large (${(file.size / 1024).toFixed(2)}KB) and may increase token usage`);
    }

    return {
      name: file.name,
      mimeType: file.mimeType || 'text/plain',
      size: file.size || content.length,
      content,
    };
  } catch (error) {
    console.error('Error picking file:', error);
    return null;
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
