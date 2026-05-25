import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { FileText, Trash2, Upload, CircleAlert as AlertCircle, ToggleLeft as Toggle2 } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { ProjectFile } from '@/types';
import { formatFileSize } from '@/utils/fileImport';
import { Button } from './Button';

interface FilesPanelProps {
  files: ProjectFile[];
  onAddFile: () => Promise<void>;
  onDeleteFile: (id: string) => Promise<void>;
  onToggleFile: (id: string, enabled: boolean) => Promise<void>;
  loading?: boolean;
}

export function FilesPanel({
  files,
  onAddFile,
  onDeleteFile,
  onToggleFile,
  loading = false,
}: FilesPanelProps) {
  const { colors } = useTheme();
  const [uploading, setUploading] = useState(false);

  const handleAddFile = async () => {
    setUploading(true);
    try {
      await onAddFile();
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = (file: ProjectFile) => {
    Alert.alert('Delete File', `Remove "${file.name}" from this project?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => onDeleteFile(file.id),
      },
    ]);
  };

  const renderFile = ({ item }: { item: ProjectFile }) => (
    <View
      style={[
        styles.fileItem,
        {
          backgroundColor: colors.surfaceSecondary,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.fileIcon}>
        <FileText size={20} color={colors.primary} />
      </View>

      <View style={styles.fileInfo}>
        <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.fileSize, { color: colors.textSecondary }]}>
          {formatFileSize(item.size)}
        </Text>
      </View>

      <TouchableOpacity
        onPress={() => onToggleFile(item.id, !item.enabled)}
        style={styles.toggleButton}
      >
        <Toggle2
          size={20}
          color={item.enabled ? colors.success : colors.textTertiary}
          fill={item.enabled ? colors.success : 'transparent'}
        />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => handleDeleteFile(item)}
        style={styles.deleteButton}
      >
        <Trash2 size={18} color={colors.error} />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Button
        title={uploading ? 'Importing...' : 'Import File'}
        onPress={handleAddFile}
        loading={uploading}
        disabled={uploading}
        icon={<Upload size={20} color="#FFFFFF" />}
        style={styles.uploadButton}
      />

      {files.length > 0 && (
        <View style={styles.warningBox}>
          <AlertCircle size={16} color={colors.warning} />
          <Text style={[styles.warningText, { color: colors.warning }]}>
            Large files increase token usage. Toggle files off to exclude them from AI requests.
          </Text>
        </View>
      )}

      {files.length === 0 ? (
        <View style={styles.emptyState}>
          <FileText size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
            No files yet
          </Text>
          <Text style={[styles.emptyDesc, { color: colors.textTertiary }]}>
            Import reference files to include them in your AI conversations
          </Text>
        </View>
      ) : (
        <FlatList
          data={files}
          renderItem={renderFile}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.filesList}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  uploadButton: {
    marginBottom: 16,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  filesList: {
    gap: 8,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
  },
  fileIcon: {
    width: 40,
    height: 40,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
  },
  fileSize: {
    fontSize: 12,
    marginTop: 2,
  },
  toggleButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptyDesc: {
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
  },
});
