import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastContainerComponent } from './shared/toast/toast-container';
@Component({
  selector: 'app-root',
  standalone: true,              
  imports: [RouterOutlet, ToastContainerComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.css']       
})
export class App {
  protected title = 'Kadosh-FrontEnd';
}
