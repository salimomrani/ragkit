import { Component, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { toSignal } from "@angular/core/rxjs-interop";

interface User {
  id: number;
  name: string;
}

@Component({
  selector: "app-user-list",
  template: ``,
})
export class UserListComponent {
  private http = inject(HttpClient);

  users = toSignal(this.http.get<User[]>("/api/users"), { initialValue: [] });
}
