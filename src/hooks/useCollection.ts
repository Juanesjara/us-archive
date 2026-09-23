import { useEffect, useState } from 'react'
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  type DocumentData,
  type QueryConstraint,
} from 'firebase/firestore'
import { getDb } from '../lib/firebase'

interface CollectionState<T> {
  items: T[]
  loading: boolean
  error: string | null
}

/**
 * Live subscription to a Firestore collection, ordered by a field.
 * Items always carry their document id.
 */
export function useCollection<T extends { id: string }>(
  path: string,
  orderField = 'date',
  direction: 'asc' | 'desc' = 'desc',
): CollectionState<T> {
  const [state, setState] = useState<CollectionState<T>>({ items: [], loading: true, error: null })

  useEffect(() => {
    const constraints: QueryConstraint[] = [orderBy(orderField, direction)]
    const q = query(collection(getDb(), path), ...constraints)
    return onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as DocumentData) }) as T)
        setState({ items, loading: false, error: null })
      },
      (err) => setState({ items: [], loading: false, error: err.message }),
    )
  }, [path, orderField, direction])

  return state
}

interface DocState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

/** Live subscription to a single document. data is null while missing. */
export function useDocument<T>(path: string): DocState<T> {
  const [state, setState] = useState<DocState<T>>({ data: null, loading: true, error: null })

  useEffect(() => {
    const ref = doc(getDb(), path)
    return onSnapshot(
      ref,
      (snap) => setState({ data: snap.exists() ? (snap.data() as T) : null, loading: false, error: null }),
      (err) => setState({ data: null, loading: false, error: err.message }),
    )
  }, [path])

  return state
}
