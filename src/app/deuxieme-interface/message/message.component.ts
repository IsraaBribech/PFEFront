import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

interface Message {
  _id: string;
  sender: string;
  senderName: string;
  senderEmail: string;
  recipient: string;
  recipientName: string;
  subject: string;
  content: string;
  date: Date;
  unread: boolean;
  archived: boolean;
  attachments?: {
    name: string;
    url: string;
    size: number;
  }[];
}

@Component({
  selector: 'app-message',
  templateUrl: './message.component.html',
  styleUrls: ['./message.component.css']
})
export class MessageComponent implements OnInit {
  // Teacher Information
  id = 'T123';
  enseignantName = 'Israa Bribech';
  enseignantEmail = 'israabribech2002@gmail.com';

  // Messages
  messages: Message[] = [];
  filteredMessages: Message[] = [];
  selectedMessage: Message | null = null;
  unreadCount = 0;
  searchTerm = '';

  // Active Tab
  activeTab = 'inbox';

  // Etudiants
  etudiants: any[] = [];

  // Forms
  messageForm!: FormGroup;
  replyForm!: FormGroup;

  // File inputs
  @ViewChild('messageFileInput') messageFileInput!: ElementRef;
  @ViewChild('replyFileInput') replyFileInput!: ElementRef;

  // Selected files
  selectedFiles: File[] = [];
  replyFiles: File[] = [];

  // Active Modal
  activeModal: string | null = null;

  constructor(private fb: FormBuilder) {
    this.initializeForms();
  }

  ngOnInit(): void {
    this.loadMockData();
    this.filterMessages();
  }

  private initializeForms(): void {
    this.messageForm = this.fb.group({
      recipient: ['', Validators.required],
      subject: ['', Validators.required],
      content: ['', Validators.required]
    });

    this.replyForm = this.fb.group({
      subject: ['', Validators.required],
      content: ['', Validators.required]
    });
  }

  loadMockData(): void {
    // Charger les étudiants
    this.etudiants = [
      { _id: 'e1', name: 'Jean Dupont', email: 'jean.dupont@email.com', matricule: 'E12345' },
      { _id: 'e2', name: 'Marie Martin', email: 'marie.martin@email.com', matricule: 'E12346' },
      { _id: 'e3', name: 'Pierre Durand', email: 'pierre.durand@email.com', matricule: 'E12347' }
    ];
    
    // Charger les messages
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);
    
    this.messages = [
      {
        _id: 'm1',
        sender: 'e1',
        senderName: 'Jean Dupont',
        senderEmail: 'jean.dupont@email.com',
        recipient: this.id,
        recipientName: this.enseignantName,
        subject: 'Question sur le cours Angular',
        content: 'Bonjour Madame,\n\nJ\'ai une question concernant le dernier cours sur Angular. Pourriez-vous m\'expliquer comment fonctionne l\'injection de dépendances ?\n\nCordialement,\nJean Dupont',
        date: yesterday,
        unread: true,
        archived: false,
        attachments: []
      },
      {
        _id: 'm2',
        sender: 'e2',
        senderName: 'Marie Martin',
        senderEmail: 'marie.martin@email.com',
        recipient: this.id,
        recipientName: this.enseignantName,
        subject: 'Devoir de programmation',
        content: 'Bonjour Madame,\n\nJe vous envoie mon devoir de programmation. J\'espère qu\'il répond à vos attentes.\n\nCordialement,\nMarie Martin',
        date: lastWeek,
        unread: false,
        archived: false,
        attachments: [
          {
            name: 'devoir.pdf',
            url: 'https://example.com/devoir.pdf',
            size: 1024 * 1024 // 1MB
          }
        ]
      },
      {
        _id: 'm3',
        sender: 'admin',
        senderName: 'Administration',
        senderEmail: 'admin@eduspace.com',
        recipient: this.id,
        recipientName: this.enseignantName,
        subject: 'Réunion pédagogique',
        content: 'Cher(e) enseignant(e),\n\nNous vous informons qu\'une réunion pédagogique aura lieu le 15 juin à 14h00 dans la salle de conférence.\n\nCordialement,\nL\'administration',
        date: today,
        unread: true,
        archived: false,
        attachments: []
      },
      {
        _id: 'm4',
        sender: this.id,
        senderName: this.enseignantName,
        senderEmail: this.enseignantEmail,
        recipient: 'e3',
        recipientName: 'Pierre Durand',
        subject: 'Retour sur votre projet',
        content: 'Bonjour Pierre,\n\nJ\'ai examiné votre projet et j\'ai quelques commentaires à vous faire. Dans l\'ensemble, c\'est un bon travail, mais il y a quelques points à améliorer.\n\nCordialement,\nIsraa Bribech',
        date: lastWeek,
        unread: false,
        archived: false,
        attachments: []
      }
    ];
    
    // Filtrer les messages selon l'onglet actif
    this.filterMessagesByTab();
    
    // Calculer le nombre de messages non lus
    this.unreadCount = this.messages.filter(msg => msg.unread && !msg.archived && msg.recipient === this.id).length;
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
    this.selectedMessage = null;
    this.filterMessagesByTab();
  }

  filterMessagesByTab(): void {
    if (this.activeTab === 'inbox') {
      this.messages = this.messages.filter(msg => !msg.archived && msg.recipient === this.id);
    } else if (this.activeTab === 'sent') {
      this.messages = this.messages.filter(msg => !msg.archived && msg.sender === this.id);
    } else if (this.activeTab === 'archived') {
      this.messages = this.messages.filter(msg => msg.archived && (msg.recipient === this.id || msg.sender === this.id));
    }
    
    this.filteredMessages = [...this.messages];
  }

  filterMessages(): void {
    if (!this.searchTerm.trim()) {
      this.filteredMessages = [...this.messages];
      return;
    }

    const term = this.searchTerm.toLowerCase().trim();
    this.filteredMessages = this.messages.filter(msg => 
      msg.subject.toLowerCase().includes(term) || 
      msg.content.toLowerCase().includes(term) || 
      msg.senderName.toLowerCase().includes(term)
    );
  }

  selectMessage(message: Message): void {
    this.selectedMessage = message;
    
    if (message.unread && message.recipient === this.id) {
      message.unread = false;
      this.unreadCount = Math.max(0, this.unreadCount - 1);
    }
  }

  showModal(modalType: string): void {
    this.activeModal = modalType;

    // Reset files
    this.selectedFiles = [];
    this.replyFiles = [];

    // Reset forms
    if (modalType === 'newMessage') {
      this.messageForm.reset();
    } else if (modalType === 'reply' && this.selectedMessage) {
      this.replyForm.reset();
      this.replyForm.patchValue({
        subject: `Re: ${this.selectedMessage.subject}`,
        content: `\n\n-------- Message original --------\nDe: ${this.selectedMessage.senderName}\nDate: ${new Date(this.selectedMessage.date).toLocaleString()}\nSujet: ${this.selectedMessage.subject}\n\n${this.selectedMessage.content}`
      });
    }
  }

  hideModal(): void {
    this.activeModal = null;
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      for (let i = 0; i < input.files.length; i++) {
        this.selectedFiles.push(input.files[i]);
      }
    }
  }

  onReplyFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      for (let i = 0; i < input.files.length; i++) {
        this.replyFiles.push(input.files[i]);
      }
    }
  }

  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
  }

  removeReplyFile(index: number): void {
    this.replyFiles.splice(index, 1);
  }

  sendMessage(): void {
    if (this.messageForm.valid) {
      const recipientId = this.messageForm.value.recipient;
      let recipientName = '';
      
      if (recipientId === 'all') {
        recipientName = 'Tous les étudiants';
      } else if (recipientId === 'admin') {
        recipientName = 'Administration';
      } else {
        const etudiant = this.etudiants.find(e => e._id === recipientId);
        recipientName = etudiant ? etudiant.name : '';
      }
      
      const newMessage: Message = {
        _id: `m${this.messages.length + 1}`,
        sender: this.id,
        senderName: this.enseignantName,
        senderEmail: this.enseignantEmail,
        recipient: recipientId,
        recipientName: recipientName,
        subject: this.messageForm.value.subject,
        content: this.messageForm.value.content,
        date: new Date(),
        unread: true,
        archived: false,
        attachments: this.selectedFiles.map(file => ({
          name: file.name,
          url: URL.createObjectURL(file),
          size: file.size
        }))
      };
      
      // Dans une implémentation réelle, vous enverriez ce message à une API
      console.log('Message envoyé:', newMessage);
      
      // Ajouter le message à la liste des messages envoyés
      this.messages.push(newMessage);
      
      // Réinitialiser le formulaire et fermer la modale
      this.hideModal();
      this.messageForm.reset();
      this.selectedFiles = [];
      if (this.messageFileInput) {
        this.messageFileInput.nativeElement.value = '';
      }
    }
  }

  replyToMessage(): void {
    if (!this.selectedMessage) return;
    this.showModal('reply');
  }

  submitReply(): void {
    if (this.replyForm.valid && this.selectedMessage) {
      const newMessage: Message = {
        _id: `m${this.messages.length + 1}`,
        sender: this.id,
        senderName: this.enseignantName,
        senderEmail: this.enseignantEmail,
        recipient: this.selectedMessage.sender,
        recipientName: this.selectedMessage.senderName,
        subject: this.replyForm.value.subject,
        content: this.replyForm.value.content,
        date: new Date(),
        unread: true,
        archived: false,
        attachments: this.replyFiles.map(file => ({
          name: file.name,
          url: URL.createObjectURL(file),
          size: file.size
        }))
      };
      
      // Dans une implémentation réelle, vous enverriez cette réponse à une API
      console.log('Réponse envoyée:', newMessage);
      
      // Ajouter la réponse à la liste des messages envoyés
      this.messages.push(newMessage);
      
      // Réinitialiser le formulaire et fermer la modale
      this.hideModal();
      this.replyForm.reset();
      this.replyFiles = [];
      if (this.replyFileInput) {
        this.replyFileInput.nativeElement.value = '';
      }
    }
  }

  forwardMessage(): void {
    if (!this.selectedMessage) return;
    
    this.showModal('newMessage');
    this.messageForm.patchValue({
      subject: `Fwd: ${this.selectedMessage.subject}`,
      content: `\n\n-------- Message transféré --------\nDe: ${this.selectedMessage.senderName}\nDate: ${new Date(this.selectedMessage.date).toLocaleString()}\nSujet: ${this.selectedMessage.subject}\n\n${this.selectedMessage.content}`
    });
  }

  archiveMessage(): void {
    if (!this.selectedMessage) return;
    
    this.selectedMessage.archived = true;
    console.log('Message archivé:', this.selectedMessage);
    
    // Retirer le message de la liste filtrée
    const index = this.filteredMessages.findIndex(m => m._id === this.selectedMessage?._id);
    if (index !== -1) {
      this.filteredMessages.splice(index, 1);
    }
    
    this.selectedMessage = null;
  }

  deleteMessage(): void {
    if (!this.selectedMessage) return;
    
    if (confirm('Êtes-vous sûr de vouloir supprimer ce message ?')) {
      console.log('Message supprimé:', this.selectedMessage);
      
      // Retirer le message de la liste
      const index = this.messages.findIndex(m => m._id === this.selectedMessage?._id);
      if (index !== -1) {
        this.messages.splice(index, 1);
      }
      
      // Retirer le message de la liste filtrée
      const filteredIndex = this.filteredMessages.findIndex(m => m._id === this.selectedMessage?._id);
      if (filteredIndex !== -1) {
        this.filteredMessages.splice(filteredIndex, 1);
      }
      
      this.selectedMessage = null;
    }
  }

  downloadAttachment(attachment: any): void {
    // Dans une implémentation réelle, vous téléchargeriez le fichier
    console.log('Téléchargement de la pièce jointe:', attachment.name);
    window.open(attachment.url, '_blank');
  }
}