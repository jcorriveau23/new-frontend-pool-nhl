import Dexie from "dexie";

export const db = new Dexie("slapshot");

db.version(1).stores({
  pools: "++id, name", // Primary key and indexed props
});
