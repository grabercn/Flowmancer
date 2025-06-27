import { message } from 'antd';
import type { FlowmancerSaveData } from '../types';

export const saveFlowmancerFile = (
  fileName: string | 'untitled',
  {
    entities,
    entityCounter,
    backendSummary,
    frontendSchema = undefined,
  }: {
    entities: any[];
    entityCounter: number;
    backendSummary: string;
    frontendSchema?: any;
  }
) => {
  if (!entities.length) {
    message.info('Nothing to save.');
    return;
  }

  const saveObject: FlowmancerSaveData = {
    type: 'flowmancer',
    version: '1.0',
    savedAt: new Date().toISOString(),
    backendSummary,
    frontendSchema,
    designData: {
      entities,
      entityCounter,
    },
  };

  const blob = new Blob([JSON.stringify(saveObject, null, 2)], {
    type: 'application/flowmancer+json',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}.flowmancer`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  message.success('Project saved as .flowmancer file!');
};

export const loadFlowmancerFile = (
  file: File
): Promise<FlowmancerSaveData> => {
  return new Promise((resolve, reject) => {
    if (!file.name.endsWith('.flowmancer')) {
      reject(new Error('Invalid file type. Please upload a .flowmancer file.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = e => {
      try {
        const result = e.target?.result;
        if (typeof result !== 'string') throw new Error('File could not be read.');

        const parsed = JSON.parse(result);

        // Validate structure
        if (
          parsed?.type !== 'flowmancer' ||
          !Array.isArray(parsed?.designData?.entities)
        ) {
          throw new Error('Invalid .flowmancer file format.');
        }

        resolve(parsed as FlowmancerSaveData);
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Failed to parse file.'));
      }
    };
    reader.readAsText(file);
  });
};
