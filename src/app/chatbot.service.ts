// chatbot.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ChatbotService {
  private apiUrl = 'http://localhost:5000/api/chat';

  constructor(private http: HttpClient) { }

  sendMessage(message: string) {
    return this.http.post(this.apiUrl, { message });
  }
}