import { Injectable, signal, inject } from '@angular/core';
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
import { DatabaseService } from './database.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth: Auth = getAuth(getApp());
  private dbService = inject(DatabaseService);
  public currentUser = signal<User | null>(null);

  constructor() {
    onAuthStateChanged(this.auth, (user) => {
      this.currentUser.set(user);
    });
  }

  async register({ email, password, fullName }: any) {
    const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
    const user = userCredential.user;
    
    await this.dbService.createUserProfile(user.uid, {
      name: fullName,
      email: email,
      role: 'unassigned'
    });

    return userCredential;
  }

  async login({ email, password }: any) {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  async logout() {
    return signOut(this.auth);
  }
}
