// user.service.ts — HTTP belongs in a service, not a component
@Injectable({ providedIn: "root" })
export class UserService {
  private http = inject(HttpClient);

  getAll$(): Observable<User[]> {
    return this.http
      .get<User[]>("/api/users")
      .pipe(catchError((err) => throwError(() => err)));
  }
}

// user-list.component.ts
@Component({
  selector: "app-user-list",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (usersResource.isLoading()) {
      <p>Loading...</p>
    } @else if (usersResource.error()) {
      <p>Error loading users.</p>
    } @else {
      @for (user of usersResource.value(); track user.id) {
        <app-user-item [user]="user" />
      }
    }
  `,
})
export class UserListComponent {
  private userService = inject(UserService);

  usersResource = resource({
    loader: () => firstValueFrom(this.userService.getAll$()),
  });
}
