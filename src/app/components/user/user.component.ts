import { HttpErrorResponse, HttpEvent, HttpEventType } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { BehaviorSubject, Subscription } from 'rxjs';
import { NotificationType } from 'src/app/enums/notification-type.enum';
import { Role } from 'src/app/enums/role.enum';
import { CustomHttpRespone } from 'src/app/models/custom-http-response';
import { FileUploadStatus } from 'src/app/models/file-upload-status';
import { User } from 'src/app/models/user';
import { AuthenticationService } from 'src/app/services/authentication.service';
import { NotificationService } from 'src/app/services/notification.service';
import { UserService } from 'src/app/services/user.service';

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.css']
})

export class UserComponent implements OnInit, OnDestroy{

    private titleSubject = new BehaviorSubject<string>('Users'); 
    public titleAction$ = this.titleSubject.asObservable();
    public users: User[] = [];
    private subscriptions: Subscription[] = [];
    private loggedInUserName?:string;
    public filename: any;
    public profileImage: any;
    public selectedUser?: any;
    public editedUser = new User();
    private currentUsername?: string;
    public loggedInUser: User = new User;
    public fileStatus = new FileUploadStatus();

    constructor(
      private authenticationService: AuthenticationService, 
      private userService: UserService,
      private router: Router,
      private notificationService: NotificationService
      ) {}

    ngOnInit(): void { 
        this.loggedInUser = this.authenticationService.getUserFromLocalStorage()
        this.loggedInUserName = this.loggedInUser.firstname;
        this.getUsers(true); 
      
    }

    public getUsers(showNotification: boolean): void{
      this.subscriptions.push(
        this.userService.getUsers().subscribe(
          (response: User[]) => {
            this.users = response;
            if(showNotification){
              this.userService.addUsersToLocalStorage(this.users);
              this.sendNotification(NotificationType.SUCCESS, `Welcome MR ${this.loggedInUserName?.toUpperCase()} !!.`);
            }
          },
          (httpErrorResponse: HttpErrorResponse) => {
            this.sendNotification(NotificationType.ERROR, httpErrorResponse.error.message);
          }
        )
      )
    }

    public onSelectUser(selectedUser: User){
      this.selectedUser  = selectedUser;
      document.getElementById("openUserInfo")?.click();
    }

    public onProfileImageChange(event:any): void{
      const files = event.target.files;
      this.profileImage = files[0];
      this.filename = files[0].name;
    }

    public saveNewUser(): void{ document.getElementById("new-user-save")?.click(); }

    public onAddNewUser(userForm: any): void{
      const formData = this.userService.createUserFormDate(null, userForm, this.profileImage);
      this.subscriptions.push(
        this.userService.addUser(formData).subscribe(
          (response: any) =>{
            document.getElementById("new-user-close")?.click();
            this.getUsers(false);
            this.filename = null;
            this.profileImage = null;
            userForm.reset()
            this.sendNotification(NotificationType.SUCCESS, `The new user was added successfully !!.`);
          },  
          (httpErrorResponse: HttpErrorResponse) => {
            this.sendNotification(NotificationType.ERROR, httpErrorResponse.error.message);
            this.profileImage = null;
          }
        )
      )
    }

    public onEditUser(user: User): void{
      this.editedUser = user;
      this.currentUsername = user.username;
      document.getElementById("openUserEdit")?.click();
    }

    public onUpdateUser(): void{
      const formData = this.userService.createUserFormDate(this.currentUsername, this.editedUser , this.profileImage);
      this.subscriptions.push(
        this.userService.updateUser(formData).subscribe(
          (response: any) =>{
            document.getElementById("closeEditUserModalButton")?.click();
            this.sendNotification(NotificationType.SUCCESS, `The user information were updated successfully !!.`);
            this.getUsers(false);
            this.profileImage = null;
            this.filename = null;
          },  
          (httpErrorResponse: HttpErrorResponse) => {
            this.sendNotification(NotificationType.ERROR, httpErrorResponse.error.message);
            this.profileImage = null;
          }
        )
      )
    }

    public onResetPassword(emailForm: NgForm){
      const email = emailForm.value['reset-password'];
      this.subscriptions.push(
        this.userService.resetUserPassword(email).subscribe(
          (response: CustomHttpRespone) => {
            this.sendNotification(NotificationType.SUCCESS, response.message);
          },
          (httpErrorResponse: HttpErrorResponse) => {
            this.sendNotification(NotificationType.WARNING, httpErrorResponse.error.message);
          },
          () => { emailForm.reset(); }
        )
      )
    }

    public searchInUsersList(keyword: string){
      const searchResults: User[] = [];
      for (const user of this.userService.getUsersFromLocalStorage()){
        if(
          user.firstname.toLocaleLowerCase().indexOf(keyword.toLocaleLowerCase()) !== -1 || 
          user.lastname.toLocaleLowerCase().indexOf(keyword.toLocaleLowerCase()) !== -1 ||
          user.username.toLocaleLowerCase().indexOf(keyword.toLocaleLowerCase()) !== -1 
        ){
          searchResults.push(user);
        }
      }
      this.users = searchResults;
      if (searchResults.length == 0 || !keyword) { this.users = this.userService.getUsersFromLocalStorage(); }
    }

    public onDelete(id: any){
      this.subscriptions.push(
        this.userService.deleteUser(id).subscribe(
          (response: CustomHttpRespone)=>{
            this.sendNotification(NotificationType.SUCCESS, response.message);
            this.getUsers(false);
          },
          (httpErrorResponse: HttpErrorResponse) => {
            this.sendNotification(NotificationType.ERROR, httpErrorResponse.error.message);
          }
        )
      )
    }

    public onUpdateCurrentUser(user: User): void{
      this.currentUsername = this.authenticationService.getUserFromLocalStorage().username;
      const formData = this.userService.createUserFormDate(this.currentUsername, user , this.profileImage);
      this.subscriptions.push(
        this.userService.updateUser(formData).subscribe(
          (response: any) =>{
            this.authenticationService.saveUserInLocalStorage(response);
            this.sendNotification(NotificationType.SUCCESS, `The user information were updated successfully !!.`);
            this.getUsers(false);
            this.profileImage = null;
            this.filename = null;
          },  
          (httpErrorResponse: HttpErrorResponse) => {
            this.sendNotification(NotificationType.ERROR, httpErrorResponse.error.message);
            this.profileImage = null;
          }
        )
      )
    }

    public updateProfileImage(): void{
      document.getElementById("profile-image-input")?.click();
    }

    public onUpdateProfileImage(){
      const formData = new FormData();
      formData.append('username', this.loggedInUser.username);
      formData.append('user-profile-image', this.profileImage);
      this.subscriptions.push(
        this.userService.updateProfileImage(formData).subscribe(
          (event: any) =>{
            this.reportUploadProgress(event);  
          },  
          (httpErrorResponse: HttpErrorResponse) => {
            this.sendNotification(NotificationType.ERROR, httpErrorResponse.error.message);
            this.fileStatus.status = 'done'
          }
        )
      );
    }

    private reportUploadProgress(event: any) {
        switch (event.type) {
      case HttpEventType.UploadProgress:
        this.fileStatus.percentage = Math.round(100 * event.loaded / event.total);
        this.fileStatus.status = 'progress';
        break;
      case HttpEventType.Response:
        if (event.status === 200) {
          this.loggedInUser.profileImageUrl = `${event.body.profileImageUrl}?time=${new Date().getTime()}`;
          this.sendNotification(NotificationType.SUCCESS, `${event.body.firstname}\'s profile image updated successfully`);
          this.fileStatus.status = 'done';
          break;
        } else {
          this.sendNotification(NotificationType.ERROR, `Unable to upload image. Please try again`);
          break;
        }
      default:
        `Finished all processes`;
    }
    }

    public onLogOut(){ 
      this.authenticationService.logout();
      this.router.navigateByUrl('/login');
      this.sendNotification(NotificationType.SUCCESS, "You've been successfully logged out !!.");
    }

    public getUserRole(): string { return this.authenticationService.getUserFromLocalStorage().role; }
    public get isAdmin(): boolean{ return this.getUserRole() === Role.ADMIN || this.getUserRole() === Role.SUPER_ADMIN; }
    public get isManager(): boolean{ return this.isAdmin || this.getUserRole() === Role.MANAGER; }
    public get isAdminOrManager(): boolean{ return this.isAdmin || this.isManager }

    public changeTitle(title: string): void{ this.titleSubject.next(title); }

    private sendNotification(notificationType: NotificationType, message: string) : void {
    if(message){
      this.notificationService.notify(notificationType, message);
    }else{
      this.notificationService.notify(notificationType, 'Opps !! error occured, Please try again.')
    }
    }

  public ngOnDestroy(): void { this.subscriptions.forEach(sub => sub.unsubscribe()); }

}
