import { env } from "../../config/env.js";
import { createDatabaseRuntimeInfo, detectDatabaseDriver, type DatabaseRuntimeInfo } from "./DatabaseRuntime.js";
import type { DocumentStore } from "./JsonDocumentStore.js";
import { JsonDocumentStore } from "./JsonDocumentStore.js";
import { PostgresDocumentStore } from "./PostgresDocumentStore.js";
import { SqliteAppDatabase } from "./SqliteAppDatabase.js";

export type AppPersistenceRuntime = {
  store: DocumentStore;
  info: DatabaseRuntimeInfo;
  close: () => void;
};

export function createAppPersistenceRuntime(): AppPersistenceRuntime {
  const driver = detectDatabaseDriver(env.databaseUrl, env.persistenceDriver);
  if (driver === "postgres") {
    if (!env.databaseUrl) {
      throw new Error("DATABASE_URL is required when PERSISTENCE_DRIVER=postgres.");
    }
    const store = new PostgresDocumentStore(env.databaseUrl, env.databaseSsl);
    return {
      store,
      info: createDatabaseRuntimeInfo({
        env,
        databaseUrlConfigured: true,
        adapterReady: true
      }),
      close: () => {
        if ("close" in store && typeof store.close === "function") {
          store.close();
        }
      }
    };
  }

  const { database, info } = SqliteAppDatabase.fromEnv();
  return {
    store: new JsonDocumentStore(database),
    info,
    close: () => database.close()
  };
}