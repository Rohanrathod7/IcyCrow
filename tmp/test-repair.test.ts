import { repairSpaces } from './src/side-panel/store';
import type { SpacesStore, UUID } from './src/lib/types';

const mockStore: SpacesStore = {
  ['space-1' as UUID]: {
    id: 'space-1' as UUID,
    name: 'Test Space',
    color: '#000',
    createdAt: '2021-01-01T00:00:00Z' as any,
    updatedAt: '2021-01-01T00:00:00Z' as any,
    tabs: [
      { id: 'tab-1' as UUID, url: 'https://v1.com', title: 'T1', favicon: null, scrollPosition: 0, chromeTabId: 1 },
      { id: 'tab-1' as UUID, url: 'https://v1.com', title: 'T1', favicon: null, scrollPosition: 0, chromeTabId: 1 }, // Duplicate
      { id: 'tab-2' as UUID, url: 'https://v2.com', title: 'T2', favicon: null, scrollPosition: 0, chromeTabId: 2 }
    ]
  }
};

const fixed = repairSpaces(mockStore);
const tabs = fixed['space-1' as UUID].tabs;

console.log('Original count:', mockStore['space-1' as UUID].tabs.length);
console.log('Fixed count:', tabs.length);

if (tabs.length === 2 && tabs[0].id === 'tab-1' && tabs[1].id === 'tab-2') {
  console.log('✅ repairSpaces test passed!');
} else {
  console.error('❌ repairSpaces test failed!');
  process.exit(1);
}
