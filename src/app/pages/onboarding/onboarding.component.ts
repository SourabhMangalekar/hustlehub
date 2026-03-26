import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { DatabaseService } from '../../services/database.service';
import { AuthService } from '../../services/auth.service';
import {
  ROLE_CODES,
  SUBTYPE_CODES,
  ROLE_SUBTYPES,
  CITIES,
  APP_ROUTES,
  UserRole,
  UserRoleSubtype
} from '../../core/master-data';

@Component({
  selector: 'app-onboarding',
  templateUrl: './onboarding.component.html',
  styleUrls: ['./onboarding.component.scss']
})
export class OnboardingComponent {
  private db = inject(DatabaseService);
  private auth = inject(AuthService);
  private router = inject(Router);

  // Expose constants to template
  public readonly ROLE_CODES = ROLE_CODES;
  public readonly SUBTYPE_CODES = SUBTYPE_CODES;
  public readonly CITIES = CITIES;

  // Step tracking: 1=role, 2=subtype, 3=meta, 4=confirm
  public step = 1;
  public isSaving = false;

  public selectedRole: UserRole | null = null;
  public selectedSubtype: UserRoleSubtype | null = null;

  // Flat meta form fields (save only what user fills)
  public meta = {
    city: '',
    bio: '',
    // demand/business
    companyName: '',
    // demand/bride
    weddingDate: '',
    // supply/influencer
    instagramHandle: '',
    followers: null as number | null,
    youtube: '',
    // supply/photographer & freelancer
    experienceYears: null as number | null,
    skills: '',
    equipment: ''
  };

  get subtypeOptions(): { value: UserRoleSubtype, label: string }[] {
    return ROLE_SUBTYPES
      .filter(s => s.role === this.selectedRole)
      .map(s => ({ value: s.code as UserRoleSubtype, label: s.label }));
  }

  get needsMetaStep(): boolean {
    return this.selectedSubtype !== null;
  }

  selectRole(role: UserRole) {
    this.selectedRole = role;
    this.selectedSubtype = null;
    this.step = 2;
  }

  selectSubtype(subtype: UserRoleSubtype) {
    this.selectedSubtype = subtype;
    this.step = 3;
  }

  goBack() {
    if (this.step > 1) this.step--;
  }

  goToConfirm() {
    this.step = 4;
  }

  get selectedSubtypeLabel(): string {
    return ROLE_SUBTYPES.find(s => s.code === this.selectedSubtype)?.label ?? '';
  }

  async finishOnboarding() {
    if (!this.selectedRole || !this.selectedSubtype) return;
    this.isSaving = true;

    try {
      const user = this.auth.currentUser();
      if (!user) return;

      // Build the meta object – only include what user filled in
      const metaPayload: any = {};

      if (this.selectedSubtype === SUBTYPE_CODES.BUSINESS && this.meta.companyName) {
        metaPayload.business = { companyName: this.meta.companyName };
      }
      if (this.selectedSubtype === SUBTYPE_CODES.BRIDE && this.meta.weddingDate) {
        metaPayload.personal = { weddingDate: this.meta.weddingDate };
      }
      if (this.selectedSubtype === SUBTYPE_CODES.INFLUENCER) {
        const social: any = {};
        if (this.meta.instagramHandle) social.instagramHandle = this.meta.instagramHandle;
        if (this.meta.followers) social.followers = this.meta.followers;
        if (this.meta.youtube) social.youtube = this.meta.youtube;
        if (Object.keys(social).length) metaPayload.social = social;
      }
      if ([SUBTYPE_CODES.PHOTOGRAPHER, SUBTYPE_CODES.FREELANCER].includes(this.selectedSubtype as any)) {
        const prof: any = {};
        if (this.meta.experienceYears) prof.experienceYears = this.meta.experienceYears;
        if (this.meta.skills) prof.skills = this.meta.skills.split(',').map(s => s.trim()).filter(Boolean);
        if (this.meta.equipment) prof.equipment = this.meta.equipment.split(',').map(s => s.trim()).filter(Boolean);
        if (Object.keys(prof).length) metaPayload.professional = prof;
      }

      const updatePayload: any = {
        role: this.selectedRole,
        roleSubtype: this.selectedSubtype
      };
      if (this.meta.city) updatePayload.city = this.meta.city;
      if (this.meta.bio) updatePayload.bio = this.meta.bio;
      if (Object.keys(metaPayload).length) updatePayload.meta = metaPayload;

      await this.db.updateUserProfile(user.uid, updatePayload);
      await this.router.navigate([APP_ROUTES.HOME], { replaceUrl: true });
    } catch (e) {
      console.error(e);
    } finally {
      this.isSaving = false;
    }
  }
}
