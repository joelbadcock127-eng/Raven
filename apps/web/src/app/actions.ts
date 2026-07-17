'use server';

import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase';

const VALID = new Set(['approved', 'modified', 'dismissed', 'new', 'done']);

export async function setOpportunityStatus(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '');
  if (!id || !VALID.has(status)) return;
  const supabase = supabaseAdmin();
  if (!supabase) return;
  await supabase
    .from('opportunities')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  revalidatePath('/');
}
