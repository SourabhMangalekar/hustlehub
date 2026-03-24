import { Injectable, signal } from '@angular/core';
import { 
  Auth, 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { getApp } from 'firebase/app';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth: Auth = getAuth(getApp());
  public currentUser = signal<User | null>(null);

  constructor() {
    onAuthStateChanged(this.auth, (user) => {
      this.currentUser.set(user);
    });
  }

  async register({ email, password }: any) {
    return createUserWithEmailAndPassword(this.auth, email, password);
  }

  async login({ email, password }: any) {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  async logout() {
    return signOut(this.auth);
  }
}
