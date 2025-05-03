import { Component, type OnInit } from "@angular/core"
import {  FormBuilder, type FormGroup, Validators } from "@angular/forms"
import { MatSnackBar } from "@angular/material/snack-bar"
import { DepartementsService } from "../departements.service"
import { EnseignantService } from "../enseignant.service"
import { forkJoin } from "rxjs"
import { trigger, transition, style, animate } from "@angular/animations"

@Component({
  selector: "app-enseignants",
  templateUrl: "./enseignants.component.html",
  styleUrls: ["./enseignants.component.css"],
  animations: [
    trigger("fadeIn", [transition(":enter", [style({ opacity: 0 }), animate("300ms ease-in", style({ opacity: 1 }))])]),
    trigger("slideIn", [
      transition(":enter", [
        style({ transform: "translateY(20px)", opacity: 0 }),
        animate("300ms ease-out", style({ transform: "translateY(0)", opacity: 1 })),
      ]),
    ]),
  ],
})
export class EnseignantsComponent implements OnInit {
  // Définition des propriétés
  enseignants: any[] = []

  // Propriétés pour le filtrage et l'affichage
  filteredEnseignants: any[] = []
  selectedDepartment = ""
  searchTerm = ""

  selectedEnseignant: any = null
  showAddForm = false
  editMode = false
  showDetailPanel = true // Pour contrôler l'affichage du panneau de détails

  // Propriétés pour le formulaire d'ajout d'enseignant
  activeModal: string | null = null
  userForm: FormGroup

  // Données pour les sélecteurs
  departments: any[] = []

  // Indicateurs de chargement
  loadingEnseignants = false
  loadingDepartments = false
  submitting = false
  showPassword = false

  constructor(
    private fb: FormBuilder,
    private enseignantService: EnseignantService,
    private snackBar: MatSnackBar,
    private departementsService: DepartementsService,
  ) {
    // Initialisation du formulaire utilisateur
    this.userForm = this.initForms()
  }

  ngOnInit(): void {
    // Chargement des données au démarrage du composant
    this.loadInitialData()

    // Ajouter ces lignes dans la méthode ngOnInit() pour mettre à jour le nom complet
    this.userForm.get("firstName")?.valueChanges.subscribe(() => {
      this.updateFullName()
    })

    this.userForm.get("lastName")?.valueChanges.subscribe(() => {
      this.updateFullName()
    })
  }

  // Ajouter cette nouvelle méthode après ngOnInit()
  private updateFullName(): void {
    const firstName = this.userForm.get("firstName")?.value || ""
    const lastName = this.userForm.get("lastName")?.value || ""
    if (firstName || lastName) {
      const fullName = `${firstName} ${lastName}`.trim()
      this.userForm.get("name")?.setValue(fullName)
    }
  }

  // Initialisation des formulaires avec validation améliorée
  private initForms(): FormGroup {
    return this.fb.group({
      _id: [""],
      // Informations personnelles
      firstName: ["", [Validators.required, Validators.minLength(2)]],
      lastName: ["", [Validators.required, Validators.minLength(2)]],
      name: ["", [Validators.required, Validators.minLength(3)]], // Champ complet pour la compatibilité
      birthDate: ["", [Validators.required]],
      civilStatus: ["", [Validators.required]],

      // Informations d'identification
      email: ["", [Validators.required, Validators.email]],
      cin: ["", [Validators.required, Validators.pattern(/^[0-9]{8}$/)]],
      telephone: ["", [Validators.required, Validators.pattern(/^[0-9]{8}$/)]],

      // Champs d'adresse
      street: ["", [Validators.required]],
      postalCode: ["", [Validators.required]],
      gouvernorat: ["", [Validators.required]],
      delegation: ["", [Validators.required]],

      // Informations académiques
      department: ["", [Validators.required]],
      grade: ["", [Validators.required]], // Ajout du champ grade

      // Informations supplémentaires
      couleur: ["#11cb8b"],

      // Sécurité - pour les nouveaux enseignants uniquement
      password: ["", [Validators.required, Validators.minLength(6)]],
    })
  }

  // Charger toutes les données initiales
  loadInitialData(): void {
    this.loadingEnseignants = true
    this.loadingDepartments = true

    // Utiliser forkJoin pour charger toutes les données en parallèle
    forkJoin({
      enseignants: this.enseignantService.getEnseignants(),
      departments: this.departementsService.getDepartements(),
    }).subscribe({
      next: (results) => {
        // Traiter les résultats
        this.processEnseignants(results.enseignants)
        this.departments = results.departments

        // Mettre à jour les indicateurs de chargement
        this.loadingEnseignants = false
        this.loadingDepartments = false
      },
      error: (error: any) => {
        console.error("Erreur lors du chargement des données initiales:", error)
        this.showNotification("Erreur lors du chargement des données. Veuillez réessayer.", true)

        // Mettre à jour les indicateurs de chargement même en cas d'erreur
        this.loadingEnseignants = false
        this.loadingDepartments = false
      },
    })
  }

  // Traiter les données des enseignants reçues de l'API
  processEnseignants(data: any[]): void {
    // Transformer les données des utilisateurs en format d'enseignant
    this.enseignants = data.map((user) => {
      // Extraire prénom et nom
      let prenom = "",
        nom = ""
      if (user.name) {
        const nameParts = user.name.trim().split(" ")
        if (nameParts.length >= 2) {
          prenom = nameParts[0]
          nom = nameParts.slice(1).join(" ")
        } else {
          prenom = user.name
          nom = ""
        }
      } else if (user.firstName && user.lastName) {
        prenom = user.firstName
        nom = user.lastName
      }

      // Créer l'objet enseignant avec toutes les propriétés nécessaires
      return {
        _id: user._id,
        id: user._id || user.id,
        nom: nom,
        prenom: prenom,
        email: user.email,
        cin: user.cin,
        telephone: user.telephone || "",
        birthDate: user.birthDate || "",
        civilStatus: user.civilStatus || "",
        couleur: user.couleur || this.getRandomColor(),
        departmentId: user.department,
        department: user.department,
        grade: user.grade || "", // Ajout du champ grade
        // Adresse
        street: user.street || user.address?.street || "",
        postalCode: user.postalCode || user.address?.postalCode || "",
        gouvernorat: user.gouvernorat || user.address?.gouvernorat || "",
        delegation: user.delegation || user.address?.delegation || "",
      }
    })

    // Initialiser la liste filtrée
    this.filteredEnseignants = [...this.enseignants]
  }

  // Méthodes pour le filtrage des enseignants
  applyFilters(): void {
    // Filtrer les enseignants selon les critères sélectionnés
    this.filteredEnseignants = this.enseignants.filter((enseignant) => {
      let matchesDepartment = true

      // Filtrer par département si sélectionné
      if (this.selectedDepartment) {
        matchesDepartment = enseignant.departmentId === this.selectedDepartment || 
                           enseignant.department === this.selectedDepartment
      }

      return matchesDepartment
    })

    // Appliquer la recherche si un terme est défini
    if (this.searchTerm && this.searchTerm.trim() !== "") {
      this.searchEnseignants()
    }

    // Si aucun enseignant ne correspond, afficher un message
    if (
      this.filteredEnseignants.length === 0 &&
      this.selectedDepartment
    ) {
      this.showNotification("Aucun enseignant ne correspond à vos critères de recherche", false)
    }
  }

  resetFilters(): void {
    this.selectedDepartment = ""
    this.searchTerm = ""
    this.filteredEnseignants = [...this.enseignants]
    this.showNotification("Filtres réinitialisés", false)
  }

  // Recherche d'enseignants
  searchEnseignants(): void {
    if (!this.searchTerm || this.searchTerm.trim() === "") {
      // Si le terme de recherche est vide, appliquer simplement les filtres actuels
      this.applyFilters()
      return
    }

    const searchTermLower = this.searchTerm.toLowerCase().trim()

    // Filtrer par terme de recherche
    this.filteredEnseignants = this.filteredEnseignants.filter((enseignant) => {
      return (
        (enseignant.nom && enseignant.nom.toLowerCase().includes(searchTermLower)) ||
        (enseignant.prenom && enseignant.prenom.toLowerCase().includes(searchTermLower)) ||
        (enseignant.email && enseignant.email.toLowerCase().includes(searchTermLower)) ||
        (enseignant.cin && enseignant.cin.toLowerCase().includes(searchTermLower)) ||
        (enseignant.telephone && enseignant.telephone.toLowerCase().includes(searchTermLower)) ||
        (enseignant.grade && enseignant.grade.toLowerCase().includes(searchTermLower)) ||
        this.getDepartmentName(enseignant.departmentId || enseignant.department || "").toLowerCase().includes(searchTermLower)
      )
    })
  }

  // Définition des méthodes existantes
  selectEnseignant(enseignant: any): void {
    this.selectedEnseignant = enseignant
    this.showDetailPanel = true
  }

  // Fermer le panneau de détails
  closeDetailPanel(): void {
    this.showDetailPanel = false
    this.selectedEnseignant = null
  }

  // Méthode pour éditer un enseignant
  editEnseignant(enseignant: any): void {
    this.editMode = true

    // Trouver le département correspondant
    const departmentId = enseignant.departmentId || enseignant.department || ""

    // Remplir le formulaire avec les données de l'enseignant
    this.userForm.patchValue({
      _id: enseignant._id,
      firstName: enseignant.prenom,
      lastName: enseignant.nom,
      name: `${enseignant.prenom} ${enseignant.nom}`.trim(),
      cin: enseignant.cin,
      email: enseignant.email,
      telephone: enseignant.telephone || "",
      birthDate: enseignant.birthDate || "",
      civilStatus: enseignant.civilStatus || "",
      department: departmentId,
      grade: enseignant.grade || "",
      couleur: enseignant.couleur,
      // Adresse
      street: enseignant.street,
      postalCode: enseignant.postalCode,
      gouvernorat: enseignant.gouvernorat,
      delegation: enseignant.delegation,
    })

    // Désactiver la validation du mot de passe en mode édition
    const passwordControl = this.userForm.get("password")
    if (passwordControl) {
      passwordControl.clearValidators()
      passwordControl.updateValueAndValidity()
    }

    // Afficher le modal
    this.showModal("user")
  }

  deleteEnseignant(id: string): void {
    if (confirm("Êtes-vous sûr de vouloir supprimer cet enseignant ?")) {
      this.enseignantService.deleteEnseignant(id).subscribe({
        next: () => {
          // Supprimer l'enseignant des listes locales
          this.enseignants = this.enseignants.filter((e) => e._id !== id && e.id !== id)
          this.filteredEnseignants = this.filteredEnseignants.filter((e) => e._id !== id && e.id !== id)

          if (this.selectedEnseignant && (this.selectedEnseignant._id === id || this.selectedEnseignant.id === id)) {
            this.selectedEnseignant = null
            this.showDetailPanel = false
          }

          this.showNotification("Enseignant supprimé avec succès")
        },
        error: (error: any) => {
          console.error("Erreur lors de la suppression de l'enseignant:", error)
          this.showNotification("Erreur lors de la suppression de l'enseignant", true)
        },
      })
    }
  }

  // Méthodes pour la gestion du modal utilisateur
  showModal(type: string): void {
    // Assurez-vous que les données sont chargées avant d'afficher le modal
    if (!this.departments.length) {
      this.loadDepartments()
    }
    this.activeModal = type

    // Modifier la méthode showModal() pour initialiser correctement le nom complet
    // Remplacer la partie "Si ce n'est pas en mode édition, réinitialiser le formulaire" par:
    if (!this.editMode) {
      this.userForm.reset({
        couleur: "#11cb8b",
      })

      // Réactiver la validation du mot de passe
      const passwordControl = this.userForm.get("password")
      if (passwordControl) {
        passwordControl.setValidators([Validators.required, Validators.minLength(6)])
        passwordControl.updateValueAndValidity()
      }
    } else {
      // En mode édition, s'assurer que le nom complet est correctement défini
      this.updateFullName()
    }
  }

  hideModal(): void {
    this.activeModal = null
    this.editMode = false
  }

  // Méthodes pour obtenir les noms à partir des IDs
  getDepartmentName(departmentId: string): string {
    if (!departmentId) return ""
    const department = this.departments.find((d) => d._id === departmentId || d.id === departmentId)
    return department ? department.name : ""
  }

  // Méthode pour charger les départements
  loadDepartments(): void {
    this.loadingDepartments = true
    this.departementsService.getDepartements().subscribe({
      next: (data) => {
        console.log("Départements chargés:", data)
        this.departments = data
        this.loadingDepartments = false
      },
      error: (error: any) => {
        console.error("Erreur lors du chargement des départements:", error)
        this.showNotification("Erreur lors du chargement des départements", true)
        this.loadingDepartments = false
      },
    })
  }

  // Méthode pour soumettre le formulaire utilisateur
  submitForm(type: string): void {
    if (this.submitting) {
      return // Éviter les soumissions multiples
    }

    // Log form state for debugging
    console.log("Form valid:", this.userForm.valid)
    console.log("Form values:", this.userForm.value)
    console.log("Form errors:", this.getFormValidationErrors())

    if (type === "user" && this.userForm.valid) {
      this.submitting = true
      console.log("Formulaire utilisateur soumis:", this.userForm.value)

      try {
        // Obtenir toutes les valeurs du formulaire, y compris les champs désactivés
        const formValues = this.userForm.getRawValue()

        // Construire le nom complet à partir des champs firstName et lastName si disponibles
        let fullName = formValues.name
        if (formValues.firstName && formValues.lastName) {
          fullName = `${formValues.firstName} ${formValues.lastName}`.trim()
          formValues.name = fullName
        }

        // Formater les données pour l'API
        const userData: any = {
          name: fullName,
          firstName: formValues.firstName,
          lastName: formValues.lastName,
          email: formValues.email,
          cin: formValues.cin,
          telephone: formValues.telephone,
          birthDate: formValues.birthDate,
          civilStatus: formValues.civilStatus,
          department: formValues.department,
          grade: formValues.grade, // Ajout du champ grade

          // Inclure les données d'adresse
          address: {
            street: formValues.street,
            postalCode: formValues.postalCode,
            gouvernorat: formValues.gouvernorat,
            delegation: formValues.delegation,
          },
          // Inclure aussi les champs d'adresse directement pour la compatibilité
          street: formValues.street,
          postalCode: formValues.postalCode,
          gouvernorat: formValues.gouvernorat,
          delegation: formValues.delegation,

          // Inclure les données supplémentaires
          couleur: formValues.couleur || "#11cb8b",

          // S'assurer que tous les champs requis par l'API sont présents
          role: "enseignant", // Ajouter le rôle si requis par l'API
        }

        // Ajouter le mot de passe uniquement pour les nouveaux utilisateurs
        if (!this.editMode) {
          userData["password"] = formValues.password
        }

        console.log("Données enseignant préparées:", userData)

        // Déterminer si c'est un ajout ou une mise à jour
        if (this.editMode && formValues._id) {
          // Mise à jour d'un utilisateur existant
          this.enseignantService.updateEnseignant(formValues._id, userData).subscribe({
            next: (response: any) => {
              console.log("Réponse après mise à jour enseignant:", response)
              this.showNotification("Enseignant mis à jour avec succès!")

              // Mettre à jour l'enseignant dans la liste locale
              this.updateLocalEnseignant({ ...userData, _id: formValues._id })

              this.hideModal()
              this.submitting = false
            },
            error: (error: any) => {
              this.handleSubmitError(error)
            },
          })
        } else {
          // Ajout d'un nouvel utilisateur
          this.enseignantService.addEnseignant(userData).subscribe({
            next: (response: any) => {
              console.log("Réponse après ajout enseignant:", response)
              this.showNotification("Enseignant ajouté avec succès!")

              // Ajouter l'enseignant à la liste locale
              this.addEnseignantToList({ ...userData, _id: response.user?.id || response._id })

              this.hideModal()
              this.submitting = false
            },
            error: (error: any) => {
              this.handleSubmitError(error)
            },
          })
        }
      } catch (error: any) {
        console.error("Erreur lors de la préparation des données:", error)
        this.showNotification("Erreur: " + (error.message || "Veuillez vérifier les données saisies."), true)
        this.submitting = false
      }
    } else {
      // Marquer tous les champs comme touchés pour afficher les erreurs de validation
      this.markFormGroupTouched(this.userForm)

      this.showNotification("Veuillez remplir tous les champs obligatoires correctement.", true)
    }
  }

  // Helper method to mark all form controls as touched
  markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key)
      control?.markAsTouched()
      control?.markAsDirty()
      control?.updateValueAndValidity()
    })
  }

  // Helper method to get all validation errors
  getFormValidationErrors() {
    const errors: any = {}
    Object.keys(this.userForm.controls).forEach((key) => {
      const control = this.userForm.get(key)
      if (control && control.errors) {
        errors[key] = control.errors
      }
    })
    return errors
  }

  // Gérer les erreurs de soumission
  handleSubmitError(error: any): void {
    console.error("Erreur détaillée:", error)

    // Afficher plus de détails sur l'erreur
    if (error.error) console.error("Corps de l'erreur:", error.error)
    if (error.status) {
      console.error("Code d'état HTTP:", error.status)
    }

    let errorMessage = "Erreur lors de l'opération: "

    // Construire un message d'erreur plus informatif
    if (error.error && typeof error.error === "object") {
      const errorDetails = Object.entries(error.error)
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ")
      errorMessage += errorDetails || "Veuillez vérifier les données saisies."
    } else if (error.message) {
      errorMessage += error.message
    } else if (typeof error.error === "string") {
      errorMessage += error.error
    } else {
      errorMessage += "Veuillez réessayer."
    }

    this.showNotification(errorMessage, true)
    this.submitting = false
  }

  // Mettre à jour un enseignant dans la liste locale
  updateLocalEnseignant(userData: any): void {
    // Trouver l'enseignant dans la liste
    const index = this.enseignants.findIndex((e) => e._id === userData._id || e.id === userData._id)

    if (index !== -1) {
      // Extraire prénom et nom
      let prenom = userData.firstName || "",
        nom = userData.lastName || ""
      if (!prenom && !nom && userData.name) {
        const nameParts = userData.name.trim().split(" ")
        if (nameParts.length >= 2) {
          prenom = nameParts[0]
          nom = nameParts.slice(1).join(" ")
        } else {
          prenom = userData.name
          nom = ""
        }
      }

      // Mettre à jour l'enseignant
      const updatedEnseignant = {
        ...this.enseignants[index],
        nom: nom,
        prenom: prenom,
        email: userData.email,
        cin: userData.cin,
        telephone: userData.telephone || this.enseignants[index].telephone,
        birthDate: userData.birthDate || this.enseignants[index].birthDate,
        civilStatus: userData.civilStatus || this.enseignants[index].civilStatus,
        couleur: userData.couleur,
        departmentId: userData.department,
        department: userData.department,
        grade: userData.grade || this.enseignants[index].grade,
        // Adresse
        street: userData.street || userData.address?.street || this.enseignants[index].street,
        postalCode: userData.postalCode || userData.address?.postalCode || this.enseignants[index].postalCode,
        gouvernorat: userData.gouvernorat || userData.address?.gouvernorat || this.enseignants[index].gouvernorat,
        delegation: userData.delegation || userData.address?.delegation || this.enseignants[index].delegation,
      }

      // Mettre à jour les listes
      this.enseignants[index] = updatedEnseignant

      // Mettre à jour la liste filtrée
      const filteredIndex = this.filteredEnseignants.findIndex((e) => e._id === userData._id || e.id === userData._id)
      if (filteredIndex !== -1) {
        this.filteredEnseignants[filteredIndex] = updatedEnseignant
      }

      // Mettre à jour l'enseignant sélectionné si nécessaire
      if (
        this.selectedEnseignant &&
        (this.selectedEnseignant._id === userData._id || this.selectedEnseignant.id === userData._id)
      ) {
        this.selectedEnseignant = updatedEnseignant
      }

      // Appliquer les filtres pour mettre à jour la liste filtrée
      this.applyFilters()
    }
  }

  // Méthode pour ajouter un enseignant directement à partir d'un utilisateur
  addEnseignantToList(user: any): void {
    // Extraire nom et prénom
    let prenom = user.firstName || "",
      nom = user.lastName || ""
    if (!prenom && !nom && user.name) {
      const nameParts = user.name.trim().split(" ")
      if (nameParts.length >= 2) {
        prenom = nameParts[0]
        nom = nameParts.slice(1).join(" ")
      } else {
        prenom = user.name
        nom = ""
      }
    }

    const newEnseignant = {
      _id: user._id,
      id: user._id,
      nom: nom,
      prenom: prenom,
      email: user.email,
      cin: user.cin,
      telephone: user.telephone || "",
      birthDate: user.birthDate || "",
      civilStatus: user.civilStatus || "",
      couleur: user.couleur || this.getRandomColor(),
      departmentId: user.department,
      department: user.department,
      grade: user.grade || "",
      // Adresse
      street: user.street || user.address?.street || "",
      postalCode: user.postalCode || user.address?.postalCode || "",
      gouvernorat: user.gouvernorat || user.address?.gouvernorat || "",
      delegation: user.delegation || user.address?.delegation || "",
    }

    this.enseignants.push(newEnseignant)
    this.filteredEnseignants.push(newEnseignant)

    // Appliquer les filtres actuels pour mettre à jour la liste filtrée
    this.applyFilters()
  }

  // Méthode d'affichage des notifications
  private showNotification(message: string, isError = false): void {
    this.snackBar.open(message, "Fermer", {
      duration: isError ? 8000 : 3000,
      horizontalPosition: "end",
      verticalPosition: "top",
      panelClass: isError ? ["error-notification"] : ["success-notification"],
    })
  }

  // Utilitaire pour générer une couleur aléatoire
  private getRandomColor(): string {
    const colors = [
      "#11cb8b", // Vert principal
      "#25c0fc", // Bleu principal
      "#9b59b6", // Violet
      "#e74c3c", // Rouge
      "#f39c12", // Orange
      "#1abc9c", // Turquoise
      "#d35400", // Orange foncé
      "#8e44ad", // Violet foncé
      "#16a085", // Vert foncé
      "#c0392b", // Rouge foncé
      "#27ae60", // Vert émeraude
      "#2980b9", // Bleu foncé
      "#f1c40f", // Jaune
      "#e67e22", // Carotte
      "#34495e", // Bleu gris
    ]
    return colors[Math.floor(Math.random() * colors.length)]
  }

  // Vérifier si un contrôle de formulaire a des erreurs et a été touché
  hasError(controlName: string): boolean {
    const control = this.userForm.get(controlName)
    return control ? control.invalid && (control.dirty || control.touched) : false
  }

  // Obtenir un message d'erreur pour l'affichage dans le formulaire
  getErrorMessage(controlName: string): string {
    const control = this.userForm.get(controlName)

    if (!control) return ""

    if (control.hasError("required")) {
      return "Ce champ est obligatoire"
    }
    if (control.hasError("email")) {
      return "Veuillez entrer une adresse email valide"
    }
    if (control.hasError("minlength")) {
      const minLength = control.getError("minlength").requiredLength
      return `Ce champ doit contenir au moins ${minLength} caractères`
    }
    if (control.hasError("pattern")) {
      if (controlName === "cin" || controlName === "telephone") {
        return "Ce champ doit contenir 8 chiffres"
      }
      return "Format invalide"
    }

    return ""
  }
}