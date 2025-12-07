import type {
  FieldMemory,
  CreateFieldMemoryDto,
  UpdateFieldMemoryDto,
} from '../types';

const STORAGE_KEY = 'field_memories';

function generateId(): string {
  return crypto.randomUUID();
}

export class FieldMemoryRepository {
  async findAll(): Promise<FieldMemory[]> {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return result[STORAGE_KEY] || [];
  }

  async findById(id: string): Promise<FieldMemory | null> {
    const memories = await this.findAll();
    return memories.find((m) => m.id === id) || null;
  }

  async findByUrl(url: string): Promise<FieldMemory[]> {
    const memories = await this.findAll();
    return memories
      .filter((m) => m.url === url)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  async create(dto: CreateFieldMemoryDto): Promise<FieldMemory> {
    const memories = await this.findAll();

    const newMemory: FieldMemory = {
      id: generateId(),
      url: dto.url,
      alias: dto.alias,
      fields: dto.fields,
      createdAt: Date.now(),
      lastUsedAt: null,
      useCount: 0,
    };

    memories.push(newMemory);
    await this.saveAll(memories);

    return newMemory;
  }

  async update(id: string, dto: UpdateFieldMemoryDto): Promise<FieldMemory | null> {
    const memories = await this.findAll();
    const index = memories.findIndex((m) => m.id === id);

    if (index === -1) return null;

    const updated = { ...memories[index], ...dto };
    memories[index] = updated;
    await this.saveAll(memories);

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const memories = await this.findAll();
    const filtered = memories.filter((m) => m.id !== id);

    if (filtered.length === memories.length) return false;

    await this.saveAll(filtered);
    return true;
  }

  async recordUsage(id: string): Promise<void> {
    const memories = await this.findAll();
    const index = memories.findIndex((m) => m.id === id);

    if (index === -1) return;

    memories[index].lastUsedAt = Date.now();
    memories[index].useCount += 1;
    await this.saveAll(memories);
  }

  async getNextAlias(url: string): Promise<string> {
    const memories = await this.findByUrl(url);
    const existingNumbers = memories
      .map((m) => {
        const match = m.alias.match(/^SET (\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n) => n > 0);

    const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    return `SET ${maxNumber + 1}`;
  }

  private async saveAll(memories: FieldMemory[]): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEY]: memories });
  }

  async getStats(): Promise<{ totalCount: number; totalSize: number }> {
    const memories = await this.findAll();
    const size = JSON.stringify(memories).length;
    return { totalCount: memories.length, totalSize: size };
  }

  async clear(): Promise<void> {
    await chrome.storage.local.remove(STORAGE_KEY);
  }
}

export const fieldMemoryRepository = new FieldMemoryRepository();
