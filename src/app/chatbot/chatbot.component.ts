import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

// Interface de message améliorée
interface ChatMessage {
  id?: string;
  sender: 'User' | 'Chatbot' | 'System';
  message: string;
  timestamp: Date;
  isTyping?: boolean;
  error?: boolean;
  integerValue?: number;
  avatar?: string; // Ajout d'un avatar pour personnalisation
}

// Interface de réponse API
interface ChatbotResponse {
  response?: string;
  error?: string;
}

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.css']
})
export class ChatbotComponent implements OnInit, OnDestroy {
  @ViewChild('chatContainer') private chatContainer!: ElementRef;

  userMessage: string = '';
  chatHistory: ChatMessage[] = [];
  isTyping = false;
  private controller = new AbortController();

  // Configuration du chatbot
  private readonly BOT_CONFIG = {
    welcomeMessage: 'Bonjour ! 🤖 Je suis votre assistant virtuel intelligent.',
    errorMessages: {
      emptyResponse: 'Réponse vide reçue du chatbot',
      apiError: 'Erreur de communication avec le chatbot'
    },
    apiEndpoint: 'http://localhost:11434/api/generate',
    model: 'malak09/chatbot'
  };

  // Suivi des entiers amélioré
  private integerTracker = {
    messages: [] as number[],
    sum: 0,
    average: 0,
    max: 0,
    min: 0
  };

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.initializeChatbot();
  }

  ngOnDestroy(): void {
    this.controller.abort();
    this.resetChatbot();
  }

  // Initialisation du chatbot
  private initializeChatbot(): void {
    this.addBotMessage(this.BOT_CONFIG.welcomeMessage);
  }

  // Réinitialisation complète du chatbot
  private resetChatbot(): void {
    this.chatHistory = [];
    this.resetIntegerTracking();
  }

  sendMessage(): void {
    const trimmedMessage = this.userMessage.trim();
    
    if (!trimmedMessage || this.isTyping) return;

    this.processMessage(trimmedMessage);
  }

  private processMessage(message: string): void {
    // Traitement des entiers
    this.processIntegerMessage(message);
    
    // Ajout du message utilisateur
    this.addUserMessage(message);
    
    // Effacement du champ de saisie
    this.userMessage = '';
    
    // Génération de la réponse
    this.generateResponse(message);
  }

  private processIntegerMessage(message: string): void {
    const integers = message
      .split(/\s+/)
      .map(word => parseInt(word, 10))
      .filter(num => !isNaN(num));

    if (integers.length > 0) {
      this.updateIntegerTracker(integers);
    }
  }

  private updateIntegerTracker(integers: number[]): void {
    this.integerTracker.messages.push(...integers);
    this.integerTracker.sum = this.integerTracker.messages.reduce((a, b) => a + b, 0);
    this.integerTracker.average = this.calculateAverage();
    this.integerTracker.max = Math.max(...this.integerTracker.messages);
    this.integerTracker.min = Math.min(...this.integerTracker.messages);
  }

  private calculateAverage(): number {
    const { messages, sum } = this.integerTracker;
    return messages.length > 0 ? sum / messages.length : 0;
  }

  private generateResponse(prompt: string): void {
    this.isTyping = true;
    this.addBotMessage('', true); // Indicateur de saisie

    this.sendChatbotRequest(prompt)
      .pipe(
        catchError(error => {
          this.handleResponseError(error);
          return of(null);
        })
      )
      .subscribe(response => {
        this.removeTypingIndicator();
        
        if (response?.response) {
          this.addBotMessage(response.response);
        } else {
          this.showError(this.BOT_CONFIG.errorMessages.emptyResponse);
        }
      });
  }

  private sendChatbotRequest(prompt: string): Observable<ChatbotResponse> {
    const body = {
      model: this.BOT_CONFIG.model,
      prompt: prompt,
      stream: false
    };

    return this.http.post<ChatbotResponse>(
      this.BOT_CONFIG.apiEndpoint, 
      body, 
      { context: new HttpContext() }
    );
  }

  private handleResponseError(error: any): void {
    console.error('API Error:', error);
    this.showError(this.BOT_CONFIG.errorMessages.apiError);
  }

  // Méthodes de gestion des messages

  private addUserMessage(message: string): void {
    this.addMessage('User', message);
  }

  private addBotMessage(message: string, isTyping = false): void {
    this.addMessage('Chatbot', message, { isTyping });
  }

  private addMessage(
    sender: 'User' | 'Chatbot' | 'System', 
    message: string, 
    options: { isTyping?: boolean; error?: boolean } = {}
  ): void {
    const chatMessage: ChatMessage = {
      sender,
      message,
      timestamp: new Date(),
      ...options
    };

    this.chatHistory.push(chatMessage);
    this.scrollToBottom();
  }

  private removeTypingIndicator(): void {
    this.isTyping = false;
    const lastMessage = this.chatHistory[this.chatHistory.length - 1];
    
    if (lastMessage?.isTyping) {
      this.chatHistory.pop();
    }
  }

  private showError(errorMsg: string): void {
    this.addMessage('System', errorMsg, { error: true });
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      try {
        this.chatContainer.nativeElement.scrollTop = 
          this.chatContainer.nativeElement.scrollHeight;
      } catch(err) { 
        console.error('Scroll error:', err);
      }
    }, 50);
  }

  // Méthodes utilitaires pour le suivi des entiers

  resetIntegerTracking(): void {
    this.integerTracker = {
      messages: [],
      sum: 0,
      average: 0,
      max: 0,
      min: 0
    };
    this.addBotMessage('Suivi des entiers réinitialisé.');
  }
  onScroll(event: Event): void {
    // Vous pouvez laisser cette méthode vide si vous n'avez pas de logique spécifique
    // ou l'implémenter avec des fonctionnalités spécifiques si nécessaire
    
    // Exemple simple de log
    // console.log('Scroll event triggered', event);
    
    // Ou vérifier la position de défilement
    const element = event.target as HTMLElement;
    const atBottom = element.scrollHeight - element.scrollTop === element.clientHeight;
    
    if (atBottom) {
      // Action optionnelle quand on est en bas
      // Par exemple : charger plus de messages anciens
      // this.loadMoreMessages();
    }
  }
  getIntegerStatistics(): string {
    const { messages, sum, average, max, min } = this.integerTracker;
    return `
      Entiers suivis: ${messages.join(', ')}
      Somme: ${sum}
      Moyenne: ${average.toFixed(2)}
      Maximum: ${max}
      Minimum: ${min}
    `;
  }
}