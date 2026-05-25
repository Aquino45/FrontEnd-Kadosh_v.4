// files.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class FilesService {
  private readonly base = 'https://files.wimine.com/api/files'; 

  constructor(private http: HttpClient) {}

  async upload(file: File, fileType: string): Promise<{ url: string }> {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('fileType', fileType); 

    try {
      return await firstValueFrom(this.http.post<{ url: string }>(`${this.base}/upload`, fd));
    } catch (e: any) {
      throw new Error('Error uploading file');
    }
  }
}
