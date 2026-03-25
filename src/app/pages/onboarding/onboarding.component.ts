import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { DatabaseService, UserRoleSubtype } from '../../services/database.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-onboarding',
  templateUrl: './onboarding.component.html',
  styleUrls: ['./onboarding.component.scss']
})
export class OnboardingComponent {
  private db = inject(DatabaseService);
  private auth = inject(AuthService);
  private router = inject(Router);

  // Step tracking: 1=role, 2=subtype, 3=meta, 4=confirm
  public step = 1;
  public isSaving = false;

  public selectedRole: 'demand' | 'supply' | null = null;
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
    if (this.selectedRole === 'demand') return [
      { value: 'business', label: '🏢 Business / Brand' },
      { value: 'bride', label: '💍 Bride (Wedding)' }
    ];
    if (this.selectedRole === 'supply') return [
      { value: 'influencer', label: '📸 Influencer' },
      { value: 'photographer', label: '📷 Photographer' },
      { value: 'freelancer', label: '💻 Freelancer' }
    ];
    return [];
  }

  get needsMetaStep(): boolean {
    return this.selectedSubtype !== null;
  }

  selectRole(role: 'demand' | 'supply') {
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

  async finishOnboarding() {
    if (!this.selectedRole || !this.selectedSubtype) return;
    this.isSaving = true;

    try {
      const user = this.auth.currentUser();
      if (!user) return;

      // Build the meta object – only include what user filled in
      const metaPayload: any = {};

      if (this.selectedSubtype === 'business' && this.meta.companyName) {
        metaPayload.business = { companyName: this.meta.companyName };
      }
      if (this.selectedSubtype === 'bride' && this.meta.weddingDate) {
        metaPayload.personal = { weddingDate: this.meta.weddingDate };
      }
      if (this.selectedSubtype === 'influencer') {
        const social: any = {};
        if (this.meta.instagramHandle) social.instagramHandle = this.meta.instagramHandle;
        if (this.meta.followers) social.followers = this.meta.followers;
        if (this.meta.youtube) social.youtube = this.meta.youtube;
        if (Object.keys(social).length) metaPayload.social = social;
      }
      if (['photographer', 'freelancer'].includes(this.selectedSubtype)) {
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
      await this.router.navigate(['/tabs/home'], { replaceUrl: true });
    } catch (e) {
      console.error(e);
    } finally {
      this.isSaving = false;
    }
  }
}
