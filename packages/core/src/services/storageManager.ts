import { IStorageService } from './storageInterface';

/**
 * A singleton manager for the application's storage service.
 * It allows registering a specific storage implementation (like LocalStorageService
 * or SqliteStorageService) at startup and provides a global access point to it.
 * It also includes logic for queuing and debouncing write operations for performance.
 */
class StorageManager {
    private serviceInstance: IStorageService | null = null;
    private isPersisting = false;
    private persistQueue: Array<() => Promise<void>> = [];

    /**
     * Registers the storage service implementation. This should be called once at application startup.
     * @param service An object that conforms to the IStorageService interface.
     */
    register(service: IStorageService): void {
        if (this.serviceInstance) {
            console.warn("Storage service has already been registered.");
            return;
        }
        this.serviceInstance = service;
    }

    /**
     * Retrieves the registered storage service instance.
     * @returns The IStorageService instance.
     * @throws If no service has been registered.
     */
    get(): IStorageService {
        if (!this.serviceInstance) {
            throw new Error("Storage service has not been registered. Please call register() at application startup.");
        }
        return this.serviceInstance;
    }

    /**
     * Queues a persistence operation to be executed in a batch.
     * This helps to debounce multiple rapid write operations into a single one.
     * @param operation An async function that performs the write operation.
     */
    async queuePersist(operation: () => Promise<void>): Promise<void> {
        this.persistQueue.push(operation);

        if (!this.isPersisting) {
            this.isPersisting = true;
            await this.processPersistQueue();
            this.isPersisting = false;
        }
    }

    private async processPersistQueue(): Promise<void> {
        // Wait briefly to collect more potential operations into the same batch.
        await new Promise(resolve => setTimeout(resolve, 100));

        const operations = [...this.persistQueue];
        this.persistQueue = [];

        try {
            await Promise.all(operations.map(op => op()));
        } catch (error) {
            console.error('Failed to persist batched operations:', error);
        }
    }

    /**
     * Forces all pending write operations in the queue to be executed immediately.
     * Useful for ensuring data is saved before the application closes.
     */
    async flush(): Promise<void> {
        if (this.serviceInstance?.flush) {
            await this.serviceInstance.flush();
        }

        if (this.persistQueue.length > 0) {
            await this.processPersistQueue();
        }
    }
}

const storageManager = new StorageManager();
export default storageManager;