import { Component, type OnInit } from "@angular/core"
import {  FormBuilder, type FormGroup, Validators } from "@angular/forms"
import  { MatSnackBar } from "@angular/material/snack-bar"
import { forkJoin, of } from "rxjs"
import { catchError, finalize, tap } from "rxjs/operators"
import  { SpecialitesService } from "../specialites.service"
import  { NiveauxService } from "../niveaux.service"
import  { DepartementsService } from "../departements.service"
import  { GroupeService, Filiere, Groupe } from "../groupe.service"
import  { UserService, User, FiliereCount } from "../user.service"
import { trigger, transition, style, animate } from "@angular/animations"

// Interface pour les données
interface Department {
  _id: string
  name: string
  description?: string
}

interface Level {
  _id: string
  name: string
  description?: string
}

interface Specialty {
  _id: string
  id?: string
  name: string
  description?: string
  department: string
  level: string | { _id: string }
}

@Component({
  selector: "app-groupes",
  templateUrl: "./groupes.component.html",
  styleUrls: ["./groupes.component.css"],
  animations: [
    trigger("fadeIn", [transition(":enter", [style({ opacity: 0 }), animate("300ms ease-in", style({ opacity: 1 }))])]),
    trigger("slideIn", [
      transition(":enter", [
        style({ transform: "translateY(-20px)", opacity: 0 }),
        animate("300ms ease-out", style({ transform: "translateY(0)", opacity: 1 })),
      ]),
    ]),
  ],
})
export class GroupesComponent implements OnInit {
  // Données
  filieres: Filiere[] = []
  departments: Department[] = []
  niveaux: Level[] = []
  specialties: Specialty[] = []
  filteredSpecialties: Specialty[] = []
  filteredSpecialtiesForFilieres: Specialty[] = []
  availableStudents: User[] = []

  // Comptage d'étudiants par filière
  filiereStudentCounts: FiliereCount[] = []
  loadingCounts = false

  // Filtres
  filterForm: FormGroup
  searchTerm = ""

  // État du composant
  loading = false
  selectedFiliere: Filiere | null = null
  showDetails = false
  activeModal: string | null = null
  submitting = false
  error: string | null = null

  // Formulaire de filière
  filiereForm: FormGroup

  // Groupes générés automatiquement
  groupeCodes: string[] = []

  // Ajouter la propriété groupes pour stocker les codes de groupes générés
  groupes: string[] = []

  constructor(
    private fb: FormBuilder,
    private groupeService: GroupeService,
    private userService: UserService,
    private departementsService: DepartementsService,
    private niveauxService: NiveauxService,
    private specialitesService: SpecialitesService,
    private snackBar: MatSnackBar,
  ) {
    // Initialiser le formulaire de filtrage
    this.filterForm = this.fb.group({
      departement: [""],
      niveau: [""],
      specialite: [""],
    })

    // Initialiser le formulaire de filière
    this.filiereForm = this.fb.group({
      level: ["", Validators.required],
      specialty: ["", Validators.required],
      department: ["", Validators.required],
      filiereNumber: ["", [Validators.required, Validators.min(1), Validators.max(10)]],
      maxStudents: [120, Validators.required],
    })
  }

  ngOnInit(): void {
    this.loadInitialData()

    // Écouter les changements de département et niveau pour filtrer les spécialités
    this.filterForm.get("departement")?.valueChanges.subscribe((departmentId) => {
      if (departmentId) {
        this.loadSpecialtiesForDepartment(departmentId)
      } else {
        this.filteredSpecialties = []
      }
      this.filterForm.get("specialite")?.setValue("")
    })

    this.filterForm.get("niveau")?.valueChanges.subscribe((levelId) => {
      const departmentId = this.filterForm.get("departement")?.value
      if (departmentId && levelId) {
        this.loadSpecialtiesByDepartmentAndLevel(departmentId, levelId)
      }
      this.filterForm.get("specialite")?.setValue("")
    })

    // Écouter les changements de numéro de filière pour générer les groupes
    this.filiereForm.get("filiereNumber")?.valueChanges.subscribe((value) => {
      if (value) {
        this.generateGroupes(value)
      } else {
        this.groupeCodes = []
      }
    })

    // Écouter les changements de département pour le formulaire de filière
    this.filiereForm.get("department")?.valueChanges.subscribe((departmentId) => {
      console.log("Département sélectionné:", departmentId)
      if (departmentId) {
        // Réinitialiser la spécialité
        this.filiereForm.get("specialty")?.setValue("")
        this.updateFilteredSpecialtiesForFilieres()
      } else {
        this.filteredSpecialtiesForFilieres = []
      }
    })

    // Écouter les changements de niveau pour le formulaire de filière
    this.filiereForm.get("level")?.valueChanges.subscribe((levelId) => {
      console.log("Niveau sélectionné:", levelId)
      if (levelId) {
        // Réinitialiser la spécialité
        this.filiereForm.get("specialty")?.setValue("")
        this.updateFilteredSpecialtiesForFilieres()
      } else {
        this.filteredSpecialtiesForFilieres = []
      }
    })
  }

  // Charger toutes les données initiales
  loadInitialData(): void {
    this.loading = true
    this.error = null

    // Ajouter la requête pour les comptages d'étudiants par filière
    const studentCounts$ = this.userService.getStudentsCountByFiliere().pipe(
      catchError((error) => {
        console.error("Erreur lors du chargement du nombre d'étudiants par filière:", error)
        return of([])
      }),
    )

    // Utiliser catchError pour gérer les erreurs individuellement pour chaque requête
    const filieres$ = this.groupeService.getGroupes().pipe(
      catchError((error) => {
        console.error("Erreur lors du chargement des filières:", error)
        this.showNotification("Erreur lors du chargement des filières: " + error.message, true)
        return of([])
      }),
    )

    const departments$ = this.departementsService.getDepartements().pipe(
      tap((departments) => console.log("Départements chargés:", departments)),
      catchError((error) => {
        console.error("Erreur lors du chargement des départements:", error)
        return of([])
      }),
    )

    const niveaux$ = this.niveauxService.getNiveaux().pipe(
      tap((niveaux) => console.log("Niveaux chargés:", niveaux)),
      catchError((error) => {
        console.error("Erreur lors du chargement des niveaux:", error)
        return of([])
      }),
    )

    const specialties$ = this.specialitesService.getSpecialites().pipe(
      tap((specialties) => console.log("Spécialités chargées:", specialties)),
      catchError((error) => {
        console.error("Erreur lors du chargement des spécialités:", error)
        return of([])
      }),
    )

    const availableStudents$ = this.userService.getAvailableStudents().pipe(
      catchError((error) => {
        console.error("Erreur lors du chargement des étudiants disponibles:", error)
        return of([])
      }),
    )

    forkJoin({
      filieres: filieres$,
      departments: departments$,
      niveaux: niveaux$,
      specialties: specialties$,
      availableStudents: availableStudents$,
      studentCounts: studentCounts$, // Ajouter cette ligne
    })
      .pipe(
        finalize(() => {
          this.loading = false
        }),
      )
      .subscribe({
        next: (results) => {
          this.filieres = results.filieres
          this.departments = results.departments
          this.niveaux = results.niveaux
          this.specialties = results.specialties
          this.availableStudents = results.availableStudents
          this.filiereStudentCounts = results.studentCounts // Stocker les comptages

          console.log("Données chargées:", {
            departments: this.departments,
            niveaux: this.niveaux,
            specialties: this.specialties,
          })

          // Mettre à jour les statistiques des filières avec les comptages
          this.updateFiliereStats()
        },
        error: (error) => {
          console.error("Erreur lors du chargement des données:", error)
          this.showNotification("Erreur lors du chargement des données: " + error.message, true)
          this.error = "Erreur lors du chargement des données. Veuillez réessayer."
        },
      })
  }

  // Ajouter cette méthode pour mettre à jour les statistiques des filières
  updateFiliereStats(): void {
    if (!this.filiereStudentCounts.length || !this.filieres.length) return

    console.log("Mise à jour des statistiques des filières avec les comptages:", this.filiereStudentCounts)

    // Pour chaque filière, trouver le comptage correspondant
    this.filieres.forEach((filiere) => {
      const countInfo = this.filiereStudentCounts.find((c) => c._id === filiere._id)
      if (countInfo) {
        console.log(`Filière ${filiere.name}: ${countInfo.count} étudiants`)

        // Vous pouvez stocker le comptage dans une propriété de la filière si nécessaire
        filiere.studentCount = countInfo.count
      } else {
        console.log(`Aucun comptage trouvé pour la filière ${filiere.name}`)
        filiere.studentCount = 0
      }
    })
  }

  // Charger les spécialités pour un département
  loadSpecialtiesForDepartment(departmentId: string): void {
    if (!departmentId) {
      this.filteredSpecialties = []
      return
    }

    console.log("Chargement des spécialités pour le département:", departmentId)
    this.specialitesService.getSpecialitesByDepartement(departmentId).subscribe({
      next: (data: Specialty[]) => {
        console.log("Spécialités récupérées pour le département:", data)
        this.filteredSpecialties = data
      },
      error: (error) => {
        console.error("Erreur lors du chargement des spécialités:", error)
        this.showNotification("Erreur lors du chargement des spécialités: " + error.message, true)
        this.filteredSpecialties = []
      },
    })
  }

  // Charger les spécialités par département et niveau
  loadSpecialtiesByDepartmentAndLevel(departmentId: string, levelId: string): void {
    if (!departmentId || !levelId) {
      return
    }

    console.log("Chargement des spécialités pour le département et niveau:", departmentId, levelId)
    this.specialitesService.getSpecialitesByDepartement(departmentId).subscribe({
      next: (data: Specialty[]) => {
        console.log("Spécialités récupérées avant filtrage par niveau:", data)
        // Filtrer par niveau
        this.filteredSpecialties = data.filter((specialty: Specialty) => {
          if (typeof specialty.level === "object" && specialty.level !== null) {
            return specialty.level._id === levelId
          } else {
            return specialty.level === levelId
          }
        })
        console.log("Spécialités filtrées par niveau:", this.filteredSpecialties)
      },
      error: (error) => {
        console.error("Erreur lors du chargement des spécialités:", error)
        this.showNotification("Erreur lors du chargement des spécialités: " + error.message, true)
        this.filteredSpecialties = []
      },
    })
  }

  // Méthode pour filtrer les spécialités en fonction du niveau et département sélectionnés pour le formulaire de filière
  updateFilteredSpecialtiesForFilieres(): void {
    const selectedLevel = this.filiereForm.get("level")?.value
    const selectedDepartment = this.filiereForm.get("department")?.value

    console.log("Mise à jour des spécialités filtrées pour le formulaire de filière:", {
      niveau: selectedLevel,
      departement: selectedDepartment,
    })

    if (!selectedLevel || !selectedDepartment) {
      this.filteredSpecialtiesForFilieres = []
      return
    }

    // Charger les spécialités pour le département sélectionné
    this.specialitesService.getSpecialitesByDepartement(selectedDepartment).subscribe({
      next: (specialties: Specialty[]) => {
        console.log("Spécialités récupérées pour le département:", specialties)

        // Filtrer par niveau
        this.filteredSpecialtiesForFilieres = specialties.filter((specialty: Specialty) => {
          let levelMatch = false

          if (typeof specialty.level === "object" && specialty.level !== null) {
            levelMatch = specialty.level._id === selectedLevel
          } else {
            levelMatch = specialty.level === selectedLevel
          }

          console.log(
            `Spécialité ${specialty.name}: niveau ${typeof specialty.level === "object" ? specialty.level._id : specialty.level} vs ${selectedLevel} => ${levelMatch}`,
          )
          return levelMatch
        })

        console.log("Spécialités filtrées pour le formulaire:", this.filteredSpecialtiesForFilieres)
      },
      error: (error) => {
        console.error("Erreur lors du chargement des spécialités pour le formulaire:", error)
        this.showNotification("Erreur lors du chargement des spécialités: " + error.message, true)
        this.filteredSpecialtiesForFilieres = []
      },
    })
  }

  // Générer les groupes en fonction du numéro de filière
  generateGroupes(filiereNumber: number): void {
    this.groupes = []
    for (let i = 1; i <= 4; i++) {
      this.groupes.push(`${filiereNumber}.${i}`)
    }
  }

  // Réinitialiser les filtres
  resetFilters(): void {
    this.filterForm.reset({
      departement: "",
      niveau: "",
      specialite: "",
    })
    this.searchTerm = ""
    this.groupes = []
  }

  // Afficher les détails d'une filière
  viewFiliereDetails(filiere: Filiere): void {
    this.selectedFiliere = filiere
    this.showDetails = true
  }

  // Fermer les détails
  closeDetails(): void {
    this.selectedFiliere = null
    this.showDetails = false
  }

  // Supprimer une filière
  deleteFiliere(id: string, event: Event): void {
    event.stopPropagation() // Empêcher la propagation de l'événement

    if (confirm("Êtes-vous sûr de vouloir supprimer cette filière ?")) {
      this.groupeService.deleteGroupe(id).subscribe({
        next: () => {
          this.filieres = this.filieres.filter((f) => f._id !== id)
          this.showNotification("Filière supprimée avec succès")
        },
        error: (error) => {
          console.error("Erreur lors de la suppression de la filière:", error)
          this.showNotification("Erreur lors de la suppression de la filière: " + error.message, true)
        },
      })
    }
  }

  // Afficher le modal de filière
  showModal(type: string): void {
    this.activeModal = type

    if (type === "filiere") {
      this.filiereForm.reset({
        maxStudents: 120,
      })
      this.groupes = []
      this.filteredSpecialtiesForFilieres = []
    }
  }

  // Cacher le modal
  hideModal(): void {
    this.activeModal = null
    this.groupes = []
  }

  // Soumettre le formulaire de filière
  submitForm(): void {
    if (this.filiereForm.valid) {
      this.submitting = true
      this.error = null

      // Récupérer les valeurs du formulaire
      const filiereNumber = this.filiereForm.get("filiereNumber")?.value
      const levelId = this.filiereForm.get("level")?.value
      const specialtyId = this.filiereForm.get("specialty")?.value
      const departmentId = this.filiereForm.get("department")?.value

      // Récupérer les objets correspondants
      const level = this.niveaux.find((n) => n._id === levelId)
      const specialty = this.specialties.find((s) => s._id === specialtyId || s.id === specialtyId)
      const department = this.departments.find((d) => d._id === departmentId)

      console.log("Données du formulaire:", {
        filiereNumber,
        levelId,
        specialtyId,
        departmentId,
        level,
        specialty,
        department,
      })

      // Vérifier que les objets ont été trouvés
      if (!level || !specialty || !department) {
        console.error("Données manquantes:", { level, specialty, department })
        this.showNotification("Erreur: Certaines données sont manquantes ou invalides", true)
        this.submitting = false
        return
      }

      // Générer un nom de filière basé sur le numéro et le niveau
      let filiereName = `Filière ${filiereNumber}`
      filiereName += ` - ${level.name}`
      filiereName += ` - ${specialty.name}`

      // Préparer les données de la filière
      const filiereData: Partial<Filiere> = {
        numero: filiereNumber,
        name: filiereName,
        niveau: levelId,
        departement: departmentId,
        specialite: specialtyId,
        capaciteMax: this.filiereForm.get("maxStudents")?.value,
        groupes: this.groupes.map((code) => ({
          code,
          name: `Groupe ${code}`, // Added 'name' property
          nom: `Groupe ${code}`,
          capacite: 30,
          etudiants: [],
        })),
      }

      console.log("Données de filière à envoyer:", filiereData)

      // Appeler le service pour créer la filière
      this.groupeService.addGroupe(filiereData).subscribe({
        next: (newFiliere) => {
          console.log("Filière créée avec succès:", newFiliere)

          // S'assurer que newFiliere.groupes existe et est un tableau
          if (!newFiliere.groupes) {
            newFiliere.groupes = []
          }

          // Ajouter la nouvelle filière à la liste
          this.filieres = [...this.filieres, newFiliere]

          this.showNotification("Filière créée avec succès")
          this.hideModal()
          this.submitting = false

          // Recharger les données pour s'assurer que tout est à jour
          setTimeout(() => {
            this.loadInitialData()
          }, 500)
        },
        error: (error) => {
          console.error("Erreur lors de la création de la filière:", error)
          this.showNotification(
            "Erreur lors de la création de la filière: " + (error.message || "Erreur inconnue"),
            true,
          )
          this.error = "Erreur lors de la création de la filière. Veuillez réessayer."
          this.submitting = false
        },
      })
    } else {
      // Afficher les erreurs de validation
      Object.keys(this.filiereForm.controls).forEach((key) => {
        const control = this.filiereForm.get(key)
        if (control?.invalid) {
          control.markAsTouched()
          console.log(`Champ invalide: ${key}`, control.errors)
        }
      })

      this.showNotification("Veuillez corriger les erreurs dans le formulaire", true)
    }
  }

  // Ajouter un étudiant à un groupe
  addStudentToGroup(filiereId: string, groupeId: string, groupeCode: string, studentId: string): void {
    if (!studentId || !filiereId || !groupeId) {
      this.showNotification("Veuillez sélectionner un étudiant et un groupe", true)
      return
    }

    // Mettre à jour le groupe
    this.groupeService.addEtudiantToGroupe(filiereId, groupeId, studentId).subscribe({
      next: (updatedFiliere) => {
        // Mettre à jour l'étudiant
        this.userService.assignStudentToGroup(studentId, updatedFiliere.numero.toString(), groupeCode).subscribe({
          next: (updatedStudent) => {
            // Mettre à jour la liste des étudiants disponibles
            this.availableStudents = this.availableStudents.filter((s) => s._id !== studentId)

            // Mettre à jour la filière dans la liste
            const index = this.filieres.findIndex((f) => f._id === filiereId)
            if (index !== -1) {
              this.filieres[index] = updatedFiliere
            }

            // Mettre à jour les comptages d'étudiants
            this.loadStudentCounts()

            this.showNotification(`Étudiant ${updatedStudent.name} ajouté au groupe ${groupeCode}`)
          },
          error: (error) => {
            console.error("Erreur lors de la mise à jour de l'étudiant:", error)
            this.showNotification("Erreur lors de l'ajout de l'étudiant au groupe: " + error.message, true)
          },
        })
      },
      error: (error) => {
        console.error("Erreur lors de l'ajout de l'étudiant au groupe:", error)
        this.showNotification("Erreur lors de l'ajout de l'étudiant au groupe: " + error.message, true)
      },
    })
  }

  // Retirer un étudiant d'un groupe
  removeStudentFromGroup(filiereId: string, groupeId: string, studentId: string): void {
    if (!studentId || !filiereId || !groupeId) {
      this.showNotification("Données manquantes pour retirer l'étudiant", true)
      return
    }

    // Mettre à jour le groupe
    this.groupeService.removeEtudiantFromGroupe(filiereId, groupeId, studentId).subscribe({
      next: () => {
        // Mettre à jour l'étudiant
        this.userService.removeStudentFromGroup(studentId).subscribe({
          next: (updatedStudent) => {
            // Ajouter l'étudiant à la liste des étudiants disponibles
            this.availableStudents.push(updatedStudent)

            // Mettre à jour la filière dans la liste
            this.groupeService.getGroupeById(filiereId).subscribe((updatedFiliere) => {
              const index = this.filieres.findIndex((f) => f._id === filiereId)
              if (index !== -1) {
                this.filieres[index] = updatedFiliere
              }

              // Mettre à jour les comptages d'étudiants
              this.loadStudentCounts()
            })

            this.showNotification(`Étudiant ${updatedStudent.name} retiré du groupe`)
          },
          error: (error) => {
            console.error("Erreur lors de la mise à jour de l'étudiant:", error)
            this.showNotification("Erreur lors du retrait de l'étudiant du groupe: " + error.message, true)
          },
        })
      },
      error: (error) => {
        console.error("Erreur lors du retrait de l'étudiant du groupe:", error)
        this.showNotification("Erreur lors du retrait de l'étudiant du groupe: " + error.message, true)
      },
    })
  }

  // Ajouter cette méthode pour charger les comptages d'étudiants
  loadStudentCounts(): void {
    this.loadingCounts = true
    this.userService.getStudentsCountByFiliere().subscribe({
      next: (counts) => {
        this.filiereStudentCounts = counts
        this.loadingCounts = false

        // Mettre à jour les statistiques des filières avec les comptages
        this.updateFiliereStats()
      },
      error: (error) => {
        console.error("Erreur lors du chargement du nombre d'étudiants par filière:", error)
        this.showNotification("Erreur lors du chargement des statistiques d'étudiants", true)
        this.loadingCounts = false
      },
    })
  }

  // Afficher une notification
  showNotification(message: string, isError = false): void {
    this.snackBar.open(message, "Fermer", {
      duration: isError ? 5000 : 3000,
      horizontalPosition: "end",
      verticalPosition: "top",
      panelClass: isError ? ["error-notification"] : ["success-notification"],
    })
  }

  // Méthodes utilitaires
  getDepartmentName(id: string): string {
    const department = this.departments.find((d) => d._id === id)
    return department ? department.name : "Département inconnu"
  }

  getLevelName(id: string): string {
    const level = this.niveaux.find((n) => n._id === id)
    return level ? level.name : "Niveau inconnu"
  }

  getSpecialtyName(id: string): string {
    const specialty = this.specialties.find((s) => s._id === id || s.id === id)
    return specialty ? specialty.name : "Spécialité inconnue"
  }

  // Calculer le pourcentage de remplissage d'une filière
  getFiliereOccupancyPercentage(filiere: Filiere): number {
    if (!filiere) return 0

    // Utiliser le comptage direct s'il est disponible
    if (filiere.studentCount !== undefined) {
      return Math.round((filiere.studentCount / (filiere.capaciteMax || 120)) * 100)
    }

    // Sinon, chercher dans les comptages
    const countInfo = this.filiereStudentCounts.find((c) => c._id === filiere._id)
    if (countInfo) {
      return Math.round((countInfo.count / (filiere.capaciteMax || 120)) * 100)
    }

    // Fallback à la méthode existante
    if (!filiere.groupes) return 0
    const totalEtudiants = filiere.groupes.reduce((sum, g) => sum + (g.etudiants?.length || 0), 0)
    return Math.round((totalEtudiants / (filiere.capaciteMax || 120)) * 100)
  }

  // Obtenir la classe CSS pour la barre de progression
  getProgressBarClass(percentage: number): string {
    if (percentage < 50) return "progress-low"
    if (percentage < 80) return "progress-medium"
    return "progress-high"
  }

  // Calculer le pourcentage de remplissage d'un groupe
  getGroupeOccupancyPercentage(groupe: Groupe): number {
    if (!groupe || !groupe.etudiants) return 0
    return Math.round(((groupe.etudiants?.length || 0) / (groupe.capacite || 30)) * 100)
  }

  // Vérifier si un groupe a atteint sa capacité maximale
  isGroupeAtCapacity(groupe: Groupe): boolean {
    if (!groupe || !groupe.etudiants) return false
    return (groupe.etudiants?.length || 0) >= (groupe.capacite || 30)
  }

  // Getter pour les filières filtrées
  get filteredFilieres(): Filiere[] {
    let result = [...this.filieres]

    // Filtrer par terme de recherche
    if (this.searchTerm) {
      const searchTermLower = this.searchTerm.toLowerCase()
      result = result.filter(
        (filiere) =>
          filiere.name.toLowerCase().includes(searchTermLower) ||
          this.getDepartmentName(filiere.departement).toLowerCase().includes(searchTermLower) ||
          this.getLevelName(filiere.niveau).toLowerCase().includes(searchTermLower),
      )
    }

    // Filtrer par département
    const departementFilter = this.filterForm.get("departement")?.value
    if (departementFilter) {
      result = result.filter((filiere) => filiere.departement === departementFilter)
    }

    // Filtrer par niveau
    const niveauFilter = this.filterForm.get("niveau")?.value
    if (niveauFilter) {
      result = result.filter((filiere) => filiere.niveau === niveauFilter)
    }

    // Filtrer par spécialité
    const specialiteFilter = this.filterForm.get("specialite")?.value
    if (specialiteFilter) {
      result = result.filter((filiere) => filiere.specialite === specialiteFilter)
    }

    return result
  }

  getTotalStudents(groupes: Groupe[] | undefined): number {
    if (!groupes) return 0
    return groupes.reduce((total, groupe) => total + (groupe.etudiants?.length || 0), 0)
  }

  getFiliereStatsValue(filiere: Filiere): string {
    if (!filiere) return "0/0"

    // Utiliser le comptage direct s'il est disponible
    if (filiere.studentCount !== undefined) {
      return `${filiere.studentCount}/${filiere.capaciteMax || 120}`
    }

    // Sinon, chercher dans les comptages
    const countInfo = this.filiereStudentCounts.find((c) => c._id === filiere._id)
    if (countInfo) {
      return `${countInfo.count}/${filiere.capaciteMax || 120}`
    }

    // Fallback à la méthode existante
    if (!filiere.groupes) return "0/0"
    const total = this.getTotalStudents(filiere.groupes)
    const max = filiere.capaciteMax || 120
    return `${total}/${max}`
  }
}
