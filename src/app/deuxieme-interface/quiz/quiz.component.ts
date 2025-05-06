import { Component, type OnInit, type OnDestroy } from "@angular/core"
import {  FormBuilder, type FormGroup, type FormArray, Validators } from "@angular/forms"
import  { Subscription } from "rxjs"
import  { QuizService, Quiz, QuizQuestion, Student } from "../../quiz.service"
import  { ChapitreService, Chapitre } from "../../chapitre.service"
import  { CoursService, Cours } from "../../cours.service"
import  { SoumissionsService } from "../../soumissions.service"

// Interface pour les soumissions de quiz
interface QuizSubmission {
  etudiantId: string
  etudiantName: string
  etudiantEmail?: string
  etudiantMatricule?: string
  etudiantGroupe?: string
  dateCompletion: string | Date
  score: number
  reponses?: any[]
}

@Component({
  selector: "app-quiz",
  templateUrl: "./quiz.component.html",
  styleUrls: ["./quiz.component.css"],
})
export class QuizComponent implements OnInit, OnDestroy {
  // Données utilisateur
  enseignantName = "Professeur Nom"
  enseignantEmail = "professeur@email.com"
  enseignantId = ""

  // Données de navigation
  showCourSubmenu = false
  showSemestreSubmenu: { [key: number]: boolean } = {}
  matieresSemestre1: any[] = []
  matieresSemestre2: any[] = []

  // Données de quiz
  quizzes: Quiz[] = []
  filteredQuizzes: Quiz[] = []
  chapitres: Chapitre[] = []
  filteredChapitres: Chapitre[] = []
  cours: Cours[] = []
  isLoadingChapitres = false
  isLoadingCours = false

  // Filtres
  searchTerm = ""
  subjectFilter = ""

  // Modals
  showQuizModal = false
  showStudentModal = false
  showResponseModal = false
  editMode = false
  selectedQuiz: Quiz | null = null
  selectedStudent: Student | null = null

  // Formulaire
  quizForm: FormGroup

  // Notifications
  showNotifications = false
  notifications: any[] = []
  messageStats = { unread: 3 }

  // Subscriptions
  private subscriptions: Subscription[] = []

  constructor(
    private quizService: QuizService,
    private chapitreService: ChapitreService,
    private coursService: CoursService,
    private soumissionsService: SoumissionsService,
    private fb: FormBuilder,
  ) {
    this.quizForm = this.fb.group({
      title: ["", Validators.required],
      description: ["", Validators.required],
      subject: ["", Validators.required],
      chapitreId: [""],
      type: ["Cours", Validators.required],
      duration: [30, [Validators.required, Validators.min(5), Validators.max(180)]],
      dueDate: ["", Validators.required],
      questions: this.fb.array([]),
      published: [true], // Ajout du champ published avec valeur par défaut à true
    })
  }

  ngOnInit(): void {
    // Initialiser les données
    this.loadQuizzes()
    this.loadCours()
    this.loadNotifications()
    this.initMatieres()

    // Écouter les changements sur la matière sélectionnée
    this.quizForm.get("subject")?.valueChanges.subscribe((subject) => {
      if (subject) {
        this.loadChapitresWithQuiz(subject)
      } else {
        this.filteredChapitres = []
      }
    })
  }

  ngOnDestroy(): void {
    // Désabonner de tous les observables
    this.subscriptions.forEach((sub) => sub.unsubscribe())
  }

  // Getters pour le formulaire
  get questions(): FormArray {
    return this.quizForm.get("questions") as FormArray
  }

  // Méthodes de navigation
  toggleCourSubmenu(event: Event): void {
    event.stopPropagation()
    this.showCourSubmenu = !this.showCourSubmenu
  }

  toggleSemestreSubmenu(event: Event, semestre: number): void {
    event.stopPropagation()
    this.showSemestreSubmenu[semestre] = !this.showSemestreSubmenu[semestre]
  }

  navigateToMatiere(event: Event, matiereId: string, semestre: number): void {
    event.stopPropagation()
    // Navigation vers la matière
    console.log(`Navigation vers la matière ${matiereId} du semestre ${semestre}`)
  }

  // Méthodes de chargement des données
  loadQuizzes(): void {
    this.subscriptions.push(
      this.quizService.getQuizzes().subscribe(
        (quizzes) => {
          this.quizzes = quizzes
          this.filterQuizzes()

          // Charger les soumissions pour chaque quiz
          this.loadQuizSubmissions()
        },
        (error) => {
          console.error("Erreur lors du chargement des quiz:", error)
        },
      ),
    )
  }

  // Méthode pour charger les soumissions de quiz
  loadQuizSubmissions(): void {
    this.quizzes.forEach((quiz) => {
      if (quiz._id) {
        this.subscriptions.push(
          this.soumissionsService.getSoumissionsByQuiz(quiz._id).subscribe(
            (response: any) => {
              // Extraire les données de la réponse
              const submissions = response.data || []

              // Mettre à jour le quiz avec les informations de soumission
              quiz.responseCount = submissions.length

              // Mettre à jour les étudiants qui ont répondu
              if (!quiz.students) {
                quiz.students = []
              }

              submissions.forEach((submission: QuizSubmission) => {
                // Créer un objet étudiant à partir des données de soumission
                const student: Student = {
                  _id: submission.etudiantId,
                  name: submission.etudiantName,
                  email: submission.etudiantEmail || "Non disponible",
                  matricule: submission.etudiantMatricule || "Non disponible",
                  group: submission.etudiantGroupe || "Non disponible",
                  hasResponded: true,
                  submissionDate: new Date(submission.dateCompletion),
                  score: submission.score,
                  responses: submission.reponses,
                }

                // Vérifier si l'étudiant existe déjà dans la liste
                const existingStudentIndex = quiz.students!.findIndex((s) => s._id === student._id)

                if (existingStudentIndex >= 0) {
                  // Mettre à jour l'étudiant existant
                  quiz.students![existingStudentIndex] = student
                } else {
                  // Ajouter un nouvel étudiant
                  quiz.students!.push(student)
                }
              })

              // Mettre à jour les quiz filtrés
              this.filterQuizzes()
            },
            (error) => {
              console.error(`Erreur lors du chargement des soumissions pour le quiz ${quiz._id}:`, error)
            },
          ),
        )
      }
    })
  }

  loadCours(): void {
    this.isLoadingCours = true
    this.subscriptions.push(
      this.coursService.getCours().subscribe(
        (cours) => {
          this.cours = cours
          this.isLoadingCours = false
        },
        (error) => {
          console.error("Erreur lors du chargement des cours:", error)
          this.isLoadingCours = false
        },
      ),
    )
  }

  loadChapitresWithQuiz(courId: string): void {
    this.isLoadingChapitres = true
    this.subscriptions.push(
      this.chapitreService.getChapitresWithQuiz(courId).subscribe(
        (chapitres) => {
          this.filteredChapitres = chapitres
          this.isLoadingChapitres = false
        },
        (error) => {
          console.error("Erreur lors du chargement des chapitres avec quiz:", error)
          this.isLoadingChapitres = false
        },
      ),
    )
  }

  loadAllChapitresWithQuiz(): void {
    this.isLoadingChapitres = true
    this.subscriptions.push(
      this.chapitreService.getChapitresWithQuiz().subscribe(
        (chapitres) => {
          this.chapitres = chapitres
          this.isLoadingChapitres = false
        },
        (error) => {
          console.error("Erreur lors du chargement de tous les chapitres avec quiz:", error)
          this.isLoadingChapitres = false
        },
      ),
    )
  }

  loadNotifications(): void {
    // Simuler le chargement des notifications
    this.notifications = [
      {
        id: 1,
        sender: "Ahmed Ben Ali",
        avatar: "A",
        message: "A soumis le devoir de programmation",
        time: "Il y a 2 heures",
        read: false,
      },
      {
        id: 2,
        sender: "Fatima Trabelsi",
        avatar: "F",
        message: "A posé une question sur le cours",
        time: "Il y a 5 heures",
        read: false,
      },
      {
        id: 3,
        sender: "Omar Mansouri",
        avatar: "O",
        message: "A terminé le quiz d'algorithmes",
        time: "Hier",
        read: false,
      },
    ]
  }

  initMatieres(): void {
    // Initialiser les matières pour les menus
    this.matieresSemestre1 = [
      { id: "m1", nom: "Algorithmes", niveau: "L1", type: "Cours" },
      { id: "m2", nom: "Programmation C", niveau: "L1", type: "TD" },
      { id: "m3", nom: "Bases de données", niveau: "L1", type: "TP" },
    ]

    this.matieresSemestre2 = [
      { id: "m4", nom: "Structures de données", niveau: "L1", type: "Cours" },
      { id: "m5", nom: "Programmation orientée objet", niveau: "L1", type: "TD" },
      { id: "m6", nom: "Réseaux", niveau: "L1", type: "TP" },
    ]
  }

  // Méthodes de filtrage
  filterQuizzes(): void {
    let filtered = [...this.quizzes]

    // Filtre par terme de recherche
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase()
      filtered = filtered.filter(
        (quiz) =>
          quiz.title.toLowerCase().includes(term) ||
          (quiz.description && quiz.description.toLowerCase().includes(term)),
      )
    }

    // Filtre par matière
    if (this.subjectFilter) {
      filtered = filtered.filter((quiz) => quiz.subject === this.subjectFilter)
    }

    this.filteredQuizzes = filtered
  }

  resetFilters(): void {
    this.searchTerm = ""
    this.subjectFilter = ""
    this.filterQuizzes()
  }

  // Méthodes pour les modales
  openQuizModal(quiz?: Quiz): void {
    this.editMode = !!quiz

    // Charger tous les chapitres avec quiz pour l'affichage des titres
    this.loadAllChapitresWithQuiz()

    if (quiz) {
      this.selectedQuiz = quiz
      this.quizForm.patchValue({
        title: quiz.title,
        description: quiz.description || "",
        subject: quiz.subject || "",
        chapitreId: quiz.chapitreId || "",
        type: quiz.type || "Cours",
        duration: quiz.duration || 30,
        dueDate: this.formatDateForInput(quiz.dueDate),
        published: quiz.published !== undefined ? quiz.published : true,
      })

      // Réinitialiser les questions
      this.questions.clear()

      // Ajouter les questions existantes
      if (quiz.questions && quiz.questions.length > 0) {
        quiz.questions.forEach((question) => {
          this.addExistingQuestion(question)
        })
      }

      // Charger les chapitres pour la matière sélectionnée
      if (quiz.subject) {
        this.loadChapitresWithQuiz(quiz.subject)
      }
    } else {
      this.selectedQuiz = null
      this.quizForm.reset({
        title: "",
        description: "",
        subject: "",
        chapitreId: "",
        type: "Cours",
        duration: 30,
        dueDate: "",
        published: true,
      })
      this.questions.clear()
    }

    this.showQuizModal = true
  }

  closeQuizModal(): void {
    this.showQuizModal = false
    this.editMode = false
    this.selectedQuiz = null
    this.quizForm.reset({
      type: "Cours",
      duration: 30,
      published: true,
    })
    this.questions.clear()
  }

  openStudentModal(quiz: Quiz): void {
    this.selectedQuiz = quiz
    this.showStudentModal = true

    // Charger les soumissions les plus récentes pour ce quiz
    if (quiz._id) {
      this.subscriptions.push(
        this.soumissionsService.getSoumissionsByQuiz(quiz._id).subscribe(
          (response: any) => {
            console.log(`Soumissions récupérées pour le quiz ${quiz._id}:`, response)

            // Extraire les données de la réponse
            const submissions = response.data || []

            // Mettre à jour les informations des étudiants avec les soumissions
            if (!quiz.students) {
              quiz.students = []
            }

            submissions.forEach((submission: QuizSubmission) => {
              const existingStudentIndex = quiz.students!.findIndex((s) => s._id === submission.etudiantId)

              if (existingStudentIndex >= 0) {
                // Mettre à jour l'étudiant existant
                quiz.students![existingStudentIndex].hasResponded = true
                quiz.students![existingStudentIndex].submissionDate = new Date(submission.dateCompletion)
                quiz.students![existingStudentIndex].score = submission.score
                quiz.students![existingStudentIndex].responses = submission.reponses
              } else {
                // Ajouter un nouvel étudiant
                quiz.students!.push({
                  _id: submission.etudiantId,
                  name: submission.etudiantName,
                  email: submission.etudiantEmail || "Non disponible",
                  matricule: submission.etudiantMatricule || "Non disponible",
                  group: submission.etudiantGroupe || "Non disponible",
                  hasResponded: true,
                  submissionDate: new Date(submission.dateCompletion),
                  score: submission.score,
                  responses: submission.reponses,
                })
              }
            })

            // Mettre à jour le quiz sélectionné
            this.selectedQuiz = { ...quiz }
          },
          (error) => {
            console.error(`Erreur lors du chargement des soumissions pour le quiz ${quiz._id}:`, error)
          },
        ),
      )
    }
  }

  closeStudentModal(): void {
    this.showStudentModal = false
    this.selectedQuiz = null
  }

  openResponseModal(student: Student): void {
    this.selectedStudent = student
    this.showResponseModal = true
  }

  closeResponseModal(): void {
    this.showResponseModal = false
    this.selectedStudent = null
  }

  // Méthodes pour le formulaire de quiz
  addQuestion(): void {
    const questionForm = this.fb.group({
      text: ["", Validators.required],
      type: ["single", Validators.required],
      options: this.fb.array([]),
      correctAnswer: [""],
      points: [1, [Validators.required, Validators.min(1), Validators.max(10)]],
    })

    this.questions.push(questionForm)

    // Ajouter deux options par défaut pour les questions à choix
    const questionType = questionForm.get("type")?.value
    if (questionType === "single" || questionType === "multiple") {
      this.addOption(this.questions.length - 1)
      this.addOption(this.questions.length - 1)
    }
  }

  addExistingQuestion(question: QuizQuestion): void {
    const questionForm = this.fb.group({
      text: [question.text, Validators.required],
      type: [question.type, Validators.required],
      options: this.fb.array([]),
      correctAnswer: [question.correctAnswer || ""],
      points: [question.points, [Validators.required, Validators.min(1), Validators.max(10)]],
    })

    this.questions.push(questionForm)

    // Ajouter les options existantes
    if (question.options && question.options.length > 0) {
      const optionsArray = questionForm.get("options") as FormArray
      question.options.forEach((option) => {
        optionsArray.push(
          this.fb.group({
            text: [option.text, Validators.required],
            isCorrect: [option.isCorrect],
          }),
        )
      })
    }
  }

  removeQuestion(index: number): void {
    this.questions.removeAt(index)
  }

  addOption(questionIndex: number): void {
    const optionsArray = this.getOptionsFormArray(questionIndex)
    optionsArray.push(
      this.fb.group({
        text: ["", Validators.required],
        isCorrect: [false],
      }),
    )
  }

  removeOption(questionIndex: number, optionIndex: number): void {
    const optionsArray = this.getOptionsFormArray(questionIndex)
    optionsArray.removeAt(optionIndex)
  }

  getOptionsFormArray(questionIndex: number): FormArray {
    return this.questions.at(questionIndex).get("options") as FormArray
  }

  submitQuiz(): void {
    if (this.quizForm.invalid) {
      // Marquer tous les champs comme touchés pour afficher les erreurs
      Object.keys(this.quizForm.controls).forEach((key) => {
        const control = this.quizForm.get(key)
        control?.markAsTouched()
      })
      return
    }

    const formValue = this.quizForm.value

    // Préparer les questions avec le bon format
    const questions = formValue.questions.map((q: any) => {
      // Convertir les options au format attendu par l'API
      const formattedQuestion: QuizQuestion = {
        text: q.text,
        type: q.type,
        points: q.points,
      }

      if (q.type === "single" || q.type === "multiple") {
        formattedQuestion.options = q.options
        if (q.type === "single" && q.correctAnswer) {
          formattedQuestion.correctAnswer = q.correctAnswer
        }
      }

      return formattedQuestion
    })

    const quiz: Quiz = {
      title: formValue.title,
      description: formValue.description,
      subject: formValue.subject,
      cour: formValue.subject, // Pour la compatibilité avec le backend
      type: formValue.type,
      duration: formValue.duration,
      dueDate: new Date(formValue.dueDate),
      chapitreId: formValue.chapitreId || undefined,
      questions: questions,
      teacher: this.enseignantId || "teacher-id", // ID de l'enseignant connecté
      createdAt: new Date(),
      published: formValue.published, // Ajouter le champ published
    }

    if (this.editMode && this.selectedQuiz?._id) {
      // Mise à jour d'un quiz existant
      this.subscriptions.push(
        this.quizService.updateQuiz(this.selectedQuiz._id, quiz).subscribe({
          next: (updatedQuiz) => {
            // Mettre à jour la liste des quiz
            const index = this.quizzes.findIndex((q) => q._id === this.selectedQuiz?._id)
            if (index !== -1) {
              this.quizzes[index] = updatedQuiz
            }
            this.filterQuizzes()
            this.closeQuizModal()
          },
          error: (error) => {
            console.error("Erreur lors de la mise à jour du quiz:", error)
          },
        }),
      )
    } else {
      // Création d'un nouveau quiz
      this.subscriptions.push(
        this.quizService.createQuiz(quiz).subscribe({
          next: (newQuiz) => {
            this.quizzes.push(newQuiz)
            this.filterQuizzes()
            this.closeQuizModal()
          },
          error: (error) => {
            console.error("Erreur lors de la création du quiz:", error)
          },
        }),
      )
    }
  }

  // Méthodes pour les notifications
  toggleNotifications(event: Event): void {
    event.stopPropagation()
    this.showNotifications = !this.showNotifications
  }

  markAsRead(notification: any): void {
    notification.read = true
    this.messageStats.unread = this.notifications.filter((n) => !n.read).length
  }

  markAllAsRead(): void {
    this.notifications.forEach((n) => (n.read = true))
    this.messageStats.unread = 0
  }

  deleteNotification(id: number, event: Event): void {
    event.stopPropagation()
    this.notifications = this.notifications.filter((n) => n.id !== id)
    this.messageStats.unread = this.notifications.filter((n) => !n.read).length
  }

  // Méthodes utilitaires
  getUniqueSubjects(): string[] {
    // Utiliser les cours de la base de données au lieu des sujets extraits des quiz
    if (!this.cours || this.cours.length === 0) {
      return []
    }
    return this.cours.map((cours) => cours.titre)
  }

  getChapitreTitle(chapitreId: string): string {
    const chapitre = this.chapitres.find((ch) => ch._id === chapitreId)
    return chapitre ? chapitre.titre : "Chapitre inconnu"
  }

  formatDate(date?: Date): string {
    if (!date) return "-"
    return new Date(date).toLocaleDateString()
  }

  formatDateForInput(date?: Date): string {
    if (!date) return ""
    const d = new Date(date)
    return d.toISOString().split("T")[0]
  }

  formatTime(minutes?: number): string {
    if (!minutes) return "-"
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}min` : `${mins} min`
  }

  getResponseRate(quiz: Quiz): number {
    if (!quiz.students || quiz.students.length === 0) return 0
    const responseCount = quiz.responseCount || 0
    return Math.round((responseCount / quiz.students.length) * 100)
  }

  deleteQuiz(quiz: Quiz): void {
    if (confirm(`Êtes-vous sûr de vouloir supprimer le quiz "${quiz.title}" ?`)) {
      if (quiz._id) {
        this.subscriptions.push(
          this.quizService.deleteQuiz(quiz._id).subscribe({
            next: () => {
              this.quizzes = this.quizzes.filter((q) => q._id !== quiz._id)
              this.filterQuizzes()
            },
            error: (error) => {
              console.error("Erreur lors de la suppression du quiz:", error)
            },
          }),
        )
      }
    }
  }
}
