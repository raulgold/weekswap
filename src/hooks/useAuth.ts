import { useState, useEffect } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const register = async (email: string, password: string, name: string, referralCode?: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const referralOwn = cred.user.uid.slice(0, 8).toUpperCase();
    await setDoc(doc(db, 'users', cred.user.uid), {
      name,
      email,
      credits_balance: 0,
      pending_credits: 0,
      referral_credits: 0,
      account_status: 'active',
      referral_code: referralOwn,
      referred_by: referralCode || null,
      referral_count: 0,
      created_at: serverTimestamp(),
    });
    // Registrar indicação no servidor se veio com código
    if (referralCode) {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      fetch(`${apiUrl}/api/register-referral`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newUserId: cred.user.uid, referralCode }),
      }).catch(console.error);
    }

    return cred;
  };

  const loginWithGoogle = async (referralCode?: string) => {
    const cred = await signInWithPopup(auth, googleProvider);
    // Verificar se o usuário já existe no Firestore
    const userRef = doc(db, 'users', cred.user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      // Primeiro acesso — criar perfil
      const referralOwn = cred.user.uid.slice(0, 8).toUpperCase();
      await setDoc(userRef, {
        name: cred.user.displayName || 'Usuário',
        email: cred.user.email,
        credits_balance: 0,
        pending_credits: 0,
        referral_credits: 0,
        account_status: 'active',
        referral_code: referralOwn,
        referred_by: referralCode || null,
        referral_count: 0,
        created_at: serverTimestamp(),
      });
      if (referralCode) {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        fetch(`${apiUrl}/api/register-referral`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newUserId: cred.user.uid, referralCode }),
        }).catch(console.error);
      }
    }
    return cred;
  };

  const logout = () => signOut(auth);

  return { user, loading, login, register, loginWithGoogle, logout };
}
