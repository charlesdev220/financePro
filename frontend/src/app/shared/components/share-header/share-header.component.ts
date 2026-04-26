import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';

@Component({
  selector: 'app-share-header',
  standalone: true,
  imports: [RouterOutlet, RouterLink], // RouterOutlet renderiza 'children',
  templateUrl: './share-header.component.html',
})
export class ShareHeaderComponent implements OnInit {

  constructor() { }

  ngOnInit() { }

}
