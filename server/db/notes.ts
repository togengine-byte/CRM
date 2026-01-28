/**
 * Notes Module
 * 
 * Notes management functions for quotes, customers, and other entities.
 */

import { getDb, eq, and, desc, sql } from "./connection";
import { internalNotes as notes, users } from "../../drizzle/schema";
import { logActivity } from "./activity";

// ==================== NOTES CRUD ====================

/**
 * Get notes for an entity
 */
export async function getNotes(entityType: string, entityId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select({
    id: notes.id,
    content: notes.content,
    createdAt: notes.createdAt,
    createdBy: notes.createdBy,
    userName: users.name,
  })
    .from(notes)
    .leftJoin(users, eq(notes.createdBy, users.id))
    .where(and(
      eq(notes.entityType, entityType),
      eq(notes.entityId, entityId)
    ))
    .orderBy(desc(notes.createdAt));
}

/**
 * Create note
 */
export async function createNote(input: {
  entityType: string;
  entityId: number;
  content: string;
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (!input.content || input.content.trim().length === 0) {
    throw new Error("Note content is required");
  }

  const result = await db.insert(notes).values({
    entityType: input.entityType,
    entityId: input.entityId,
    content: input.content.trim(),
    createdBy: input.createdBy,
  }).returning();

  await logActivity(input.createdBy, "note_created", { 
    noteId: result[0].id,
    entityType: input.entityType,
    entityId: input.entityId 
  });

  return result[0];
}

/**
 * Update note
 */
export async function updateNote(noteId: number, content: string, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (!content || content.trim().length === 0) {
    throw new Error("Note content is required");
  }

  const [note] = await db.select()
    .from(notes)
    .where(eq(notes.id, noteId))
    .limit(1);

  if (!note) {
    throw new Error("Note not found");
  }

  if (note.createdBy !== userId) {
    throw new Error("You can only edit your own notes");
  }

  await db.update(notes)
    .set({ 
      content: content.trim(),
      updatedAt: new Date(),
    })
    .where(eq(notes.id, noteId));

  await logActivity(userId, "note_updated", { noteId });

  return { success: true };
}

/**
 * Delete note
 */
export async function deleteNote(noteId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [note] = await db.select()
    .from(notes)
    .where(eq(notes.id, noteId))
    .limit(1);

  if (!note) {
    throw new Error("Note not found");
  }

  if (note.createdBy !== userId) {
    throw new Error("You can only delete your own notes");
  }

  await db.delete(notes)
    .where(eq(notes.id, noteId));

  await logActivity(userId, "note_deleted", { noteId });

  return { success: true };
}

// ==================== QUOTE NOTES ====================

/**
 * Get quote notes
 */
export async function getQuoteNotes(quoteId: number) {
  return await getNotes('quote', quoteId);
}

/**
 * Add quote note
 */
export async function addQuoteNote(quoteId: number, content: string, userId: number) {
  return await createNote({
    entityType: 'quote',
    entityId: quoteId,
    content,
    createdBy: userId,
  });
}

// ==================== CUSTOMER NOTES ====================

/**
 * Get customer notes
 */
export async function getCustomerNotes(customerId: number) {
  return await getNotes('customer', customerId);
}

/**
 * Add customer note
 */
export async function addCustomerNote(customerId: number, content: string, userId: number) {
  return await createNote({
    entityType: 'customer',
    entityId: customerId,
    content,
    createdBy: userId,
  });
}

// ==================== SUPPLIER NOTES ====================

/**
 * Get supplier notes
 */
export async function getSupplierNotes(supplierId: number) {
  return await getNotes('supplier', supplierId);
}

/**
 * Add supplier note
 */
export async function addSupplierNote(supplierId: number, content: string, userId: number) {
  return await createNote({
    entityType: 'supplier',
    entityId: supplierId,
    content,
    createdBy: userId,
  });
}

// ==================== JOB NOTES ====================

/**
 * Get job notes
 */
export async function getJobNotes(jobId: number) {
  return await getNotes('job', jobId);
}

/**
 * Add job note
 */
export async function addJobNote(jobId: number, content: string, userId: number) {
  return await createNote({
    entityType: 'job',
    entityId: jobId,
    content,
    createdBy: userId,
  });
}
