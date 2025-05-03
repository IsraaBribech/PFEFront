import { Component, type OnInit, type OnDestroy } from "@angular/core"
import {  FormBuilder, type FormGroup, Validators } from "@angular/forms"
import  { MatSnackBar } from "@angular/material/snack-bar"
import  { NiveauxService } from "../niveaux.service"
import  { SpecialitesService } from "../specialites.service"
import  { DepartementsService } from "../departements.service"
import  { UserService } from "../user.service"
import { catchError, of, Subject, debounceTime, distinctUntilChanged, takeUntil, switchMap } from "rxjs"

interface Specialty {
  _id: string
  nom: string
  name?: string // Ajout pour compatibilité avec l'API
  description?: string
  niveauId?: string // Optionnel car pas utilisé par l'API
  level?: string // Ajout pour compatibilité avec l'API
  departement: string
  department?: string // Ajout pour compatibilité avec l'API
  nbEtudiants?: number
}

interface Niveau {
  _id: string
  name: string
  description?: string
  couleur?: string
  nbEtudiants?: number
  departement: string
}

@Component({
  selector: "app-niveaux",
  templateUrl: "./niveaux.component.html",
  styleUrls: ["./niveaux.component.css"],
})
export class NiveauxComponent implements OnInit, OnDestroy {
  // Modal properties
  activeModal: string | null = null
  levelForm!: FormGroup
  specialtyForm!: FormGroup

  // Data properties
  niveaux: Niveau[] = []
  users: any[] = []
  departments: any[] = []
  specialites: Specialty[] = []
  selectedNiveau: Niveau | null = null
  loading = false
  error = ""
  isEditing = false

  // Specialty properties
  editingSpecialty: Specialty | null = null
  currentNiveau: Niveau | null = null

  // Filter properties
  searchTerm = ""
  viewMode: "grid" | "list" = "grid"
  filteredNiveaux: Niveau[] = []
  selectedDepartmentFilter = ""
  selectedSpecialtyFilter = ""
  selectedSpecialty: string | null = null

  loadingSpecialites = false
  loadingDepartments = false

  private searchTerms = new Subject<string>()
  private destroy$ = new Subject<void>()

  constructor(
    private niveauxService: NiveauxService,
    private userService: UserService,
    private specialitesService: SpecialitesService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private departementsService: DepartementsService,
  ) {}

  ngOnInit(): void {
    this.initForms()
    this.initSearch()
    this.loadData()
    this.loadDepartments()
    this.loadSpecialties()
  }

  ngOnDestroy(): void {
    this.destroy$.next()
    this.destroy$.complete()
  }

  private initForms(): void {
    this.levelForm = this.fb.group({
      name: ["", Validators.required],
      description: [""],
      couleur: ["#4a4ad4e2"],
      departement: ["", Validators.required],
    })

    this.specialtyForm = this.fb.group({
      nom: ["", Validators.required],
      description: [""],
      niveauId: ["", Validators.required],
      departement: [""],
    })
  }

  private initSearch(): void {
    this.searchTerms.pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$)).subscribe((term) => {
      this.searchTerm = term
      this.applyFilters()
    })
  }

  showModal(type: string, item?: any): void {
    this.activeModal = type

    if (type === "level") {
      this.levelForm.reset({
        couleur: "#4a4ad4e2",
        departementId: "",
      })

      if (item) {
        this.isEditing = true
        this.selectedNiveau = item
        this.levelForm.patchValue({
          name: item.name,
          description: item.description || "",
          couleur: item.couleur || "#4a4ad4e2",
          departementId: item.departementId || "",
        })
      } else {
        this.isEditing = false
        this.selectedNiveau = null
      }
    } else if (type === "specialty") {
      this.specialtyForm.reset()

      if (item) {
        this.editingSpecialty = item
        this.specialtyForm.patchValue({
          nom: item.nom || item.name,
          description: item.description || "",
          niveauId: item.niveauId || item.level,
          departementId: item.departementId || item.department || item.departement,
        })
      } else {
        this.editingSpecialty = null
        if (this.currentNiveau) {
          this.specialtyForm.patchValue({
            niveauId: this.currentNiveau._id,
            departement: this.currentNiveau.departement || "",
          })
        }
      }
    }
  }

  hideModal(): void {
    this.activeModal = null
    this.isEditing = false
    this.selectedNiveau = null
    this.editingSpecialty = null
  }

  submitForm(type: string): void {
    if (type === "level" && this.levelForm.valid) {
      const niveauData = {
        name: this.levelForm.value.name,
        description: this.levelForm.value.description,
        couleur: this.levelForm.value.couleur,
        departement: this.levelForm.value.departement,
      }
      console.log("Données à envoyer:", niveauData)

      this.loading = true

      if (this.isEditing && this.selectedNiveau) {
        this.niveauxService.updateNiveau(this.selectedNiveau._id, niveauData).subscribe({
          next: (response: any) => {
            this.showNotification("Niveau modifié avec succès!")
            this.levelForm.reset()
            this.hideModal()

            const index = this.niveaux.findIndex((n) => n._id === this.selectedNiveau?._id)
            if (index !== -1) {
              this.niveaux[index] = { ...this.niveaux[index], ...niveauData }
              this.applyFilters()
            }

            this.loading = false
          },
          error: (error: any) => {
            console.error("Erreur lors de la modification du niveau:", error)
            this.showNotification("Une erreur s'est produite lors de la modification. Veuillez réessayer.", true)
            this.loading = false
          },
        })
      } else {
        this.niveauxService.addNiveau(niveauData).subscribe({
          next: (response: any) => {
            this.showNotification("Niveau ajouté avec succès!")
            this.levelForm.reset()
            this.hideModal()

            response.nbEtudiants = 0
            this.niveaux.push(response)
            this.applyFilters()

            this.loading = false
          },
          error: (error: any) => {
            console.error("Erreur lors de l'ajout du niveau:", error)
            this.showNotification("Une erreur s'est produite lors de l'ajout. Veuillez réessayer.", true)
            this.loading = false
          },
        })
      }
    } else if (type === "specialty" && this.specialtyForm.valid) {
      const specialtyData = this.specialtyForm.value
      this.loading = true

      if (this.editingSpecialty) {
        this.specialitesService.updateSpecialite(this.editingSpecialty._id, specialtyData).subscribe({
          next: (response: any) => {
            this.showNotification("Spécialité modifiée avec succès!")
            this.specialtyForm.reset()
            this.hideModal()
            this.loadSpecialties()
            this.loading = false
          },
          error: (error: any) => {
            console.error("Erreur lors de la modification de la spécialité:", error)
            this.showNotification("Une erreur s'est produite lors de la modification. Veuillez réessayer.", true)
            this.loading = false
          },
        })
      } else {
        this.specialitesService.addSpecialite(specialtyData).subscribe({
          next: (response: any) => {
            this.showNotification("Spécialité ajoutée avec succès!")
            this.specialtyForm.reset()
            this.hideModal()
            this.loadSpecialties()
            this.loading = false
          },
          error: (error: any) => {
            console.error("Erreur lors de l'ajout de la spécialité:", error)
            this.showNotification("Une erreur s'est produite lors de l'ajout. Veuillez réessayer.", true)
            this.loading = false
          },
        })
      }
    } else {
      this.showNotification("Veuillez remplir tous les champs obligatoires.", true)
    }
  }

  private showNotification(message: string, isError = false): void {
    this.snackBar.open(message, "Fermer", {
      duration: isError ? 5000 : 3000,
      horizontalPosition: "end",
      verticalPosition: "top",
      panelClass: isError ? ["error-notification"] : ["success-notification"],
    })
  }

  openSpecialtyForm(niveau: Niveau): void {
    this.currentNiveau = niveau
    this.showModal("specialty")
  }

  loadData(): void {
    this.loading = true
    this.error = ""

    // Charge d'abord les départements si pas déjà fait
    if (!this.departments.length) {
      this.loadDepartments()
    }

    // Charge les niveaux
    this.niveauxService
      .getNiveaux()
      .pipe(
        catchError((err) => {
          console.error("Erreur lors du chargement des niveaux:", err)
          this.error = "Erreur lors du chargement des niveaux"
          this.loading = false
          return of([])
        }),
        // Combine avec le chargement des utilisateurs
        switchMap((niveaux) => {
          this.niveaux = niveaux || []
          this.applyFilters()

          return this.userService.getUsers().pipe(
            catchError((err) => {
              console.error("Erreur lors du chargement des utilisateurs:", err)
              this.error += " | Erreur lors du chargement des utilisateurs"
              return of([])
            }),
          )
        }),
      )
      .subscribe((users) => {
        this.users = Array.isArray(users) ? users : []
        this.updateStudentCounts()
        this.loading = false

        // Debug: Vérifie les données
        console.log("Niveaux chargés:", this.niveaux)
        console.log("Départements disponibles:", this.departments)
      })
  }

  loadDepartments(): void {
    this.loadingDepartments = true
    this.departementsService
      .getDepartements()
      .pipe(
        catchError((err) => {
          console.error("Erreur départements:", err)
          this.showNotification("Erreur chargement départements", true)
          return of([])
        }),
      )
      .subscribe((departments) => {
        this.departments = departments
        this.loadingDepartments = false

        // Recharge les niveaux si nécessaire
        if (!this.niveaux.length) {
          this.loadData()
        }
      })
  }

  // Ajoutez cette méthode pour afficher la structure complète d'une spécialité
  logSpecialtyStructure(): void {
    if (this.specialites.length > 0) {
      console.log("Structure d'une spécialité:", JSON.stringify(this.specialites[0]))
      console.log("Propriétés disponibles:", Object.keys(this.specialites[0]))
    }
  }

  // Modifiez la méthode loadSpecialties pour corriger l'erreur
  loadSpecialties(): void {
    this.loadingSpecialites = true
    this.specialitesService
      .getSpecialites()
      .pipe(
        catchError((err) => {
          console.error("Erreur lors du chargement des spécialités:", err)
          this.showNotification("Erreur lors du chargement des spécialités", true)
          return of([])
        }),
      )
      .subscribe((data) => {
        // Correction de l'erreur ici: utiliser specialites au lieu de speciality
        this.specialites = data.map((specialite: any) => ({
          _id: specialite._id,
          nom: specialite.nom || specialite.name || "",
          description: specialite.description || "",
          niveauId: specialite.niveauId || specialite.level || "",
          departement: specialite.departement || specialite.department || "",
          nbEtudiants: specialite.nbEtudiants || 0,
        }))
        this.loadingSpecialites = false
        this.logSpecialtyStructure() // Affiche la structure pour le débogage
      })
  }

  // Modifiez la méthode getSpecialitesForNiveau pour utiliser la propriété 'level'
  getSpecialitesForNiveau(niveauId: string): Specialty[] {
    console.log(`Recherche des spécialités pour le niveau: ${niveauId}`)

    // Utilise la propriété 'level' au lieu de 'niveauId'
    const filteredSpecialties = this.specialites.filter((s) => {
      return String(s.level) === String(niveauId)
    })

    console.log(`Spécialités trouvées:`, filteredSpecialties)
    return filteredSpecialties
  }

  editSpecialty(specialite: Specialty): void {
    this.showModal("specialty", specialite)
  }

  deleteSpecialty(specialiteId: string): void {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette spécialité?")) {
      this.loading = true
      this.specialitesService.deleteSpecialite(specialiteId).subscribe({
        next: () => {
          this.showNotification("Spécialité supprimée avec succès!")
          this.loadSpecialties()
          this.loading = false
        },
        error: (err: any) => {
          console.error("Erreur lors de la suppression de la spécialité:", err)
          this.showNotification("Une erreur s'est produite lors de la suppression. Veuillez réessayer.", true)
          this.loading = false
        },
      })
    }
  }

  updateStudentCounts(): void {
    if (!this.niveaux || this.niveaux.length === 0) return

    this.niveaux.forEach((niveau) => {
      niveau.nbEtudiants = 0
    })

    if (this.users && this.users.length > 0) {
      this.users.forEach((user) => {
        if (user.level) {
          const niveau = this.niveaux.find(
            (n) => n._id === user.level || n._id === this.findNiveauIdByNumericId(user.level),
          )

          if (niveau) {
            niveau.nbEtudiants = (niveau.nbEtudiants || 0) + 1
          }
        }
      })
    }
  }

  findNiveauIdByNumericId(numericId: number): string | null {
    const mapping: { [key: number]: number } = {
      1: 0,
      2: 1,
      3: 2,
      4: 3,
      5: 4,
    }

    const index = mapping[numericId]
    return index !== undefined && this.niveaux[index] ? this.niveaux[index]._id : null
  }

  onSearchInput(value: string): void {
    this.searchTerms.next(value)
  }

  applyFilters(): void {
    let filtered = [...this.niveaux]

    // Filtrer par département
    if (this.selectedDepartmentFilter) {
      filtered = filtered.filter((niveau) => niveau.departement === this.selectedDepartmentFilter)
    }

    // Filtrer par recherche
    if (this.searchTerm) {
      const searchLower = this.searchTerm.toLowerCase()
      filtered = filtered.filter((niveau) => {
        const name = niveau.name?.toLowerCase() || ""
        const description = niveau.description?.toLowerCase() || ""
        return name.includes(searchLower) || description.includes(searchLower)
      })
    }

    this.filteredNiveaux = filtered

    if (this.filteredNiveaux.length === 0 && (this.selectedDepartmentFilter || this.searchTerm)) {
      this.showNotification("Aucun niveau ne correspond à vos critères de recherche", false)
    }
  }

  resetFilters(): void {
    this.selectedDepartmentFilter = ""
    this.selectedSpecialtyFilter = ""
    this.searchTerm = ""
    this.searchTerms.next("")
    this.applyFilters()
  }

  editNiveau(niveau: Niveau): void {
    this.showModal("level", niveau)
  }

  getDepartmentName(departmentId?: string): string {
    if (!departmentId || !this.departments.length) {
      return "Non assigné"
    }

    // Compare les IDs en tant que strings
    const department = this.departments.find((d) => String(d._id) === String(departmentId))

    return department?.name || "Non assigné"
  }

  deleteNiveau(niveauId: string): void {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce niveau? Cette action est irréversible.")) {
      this.loading = true
      this.niveauxService.deleteNiveau(niveauId).subscribe({
        next: () => {
          this.niveaux = this.niveaux.filter((niveau) => niveau._id !== niveauId)
          this.filteredNiveaux = this.filteredNiveaux.filter((niveau) => niveau._id !== niveauId)
          this.showNotification("Niveau supprimé avec succès!")
          this.loading = false
        },
        error: (err) => {
          console.error("Erreur lors de la suppression du niveau:", err)
          this.error = "Impossible de supprimer le niveau: " + (err.message || "Erreur inconnue")
          this.showNotification("Une erreur s'est produite lors de la suppression. Veuillez réessayer.", true)
          this.loading = false
        },
      })
    }
  }

  // Méthode pour gérer le changement de département
  onDepartmentChange(event: any): void {
    const departmentId = event.target ? event.target.value : (event.id || event._id);
    
    if (!departmentId) {
      // Si aucun département n'est sélectionné, charger tous les niveaux
      this.loadData();
      return;
    }
    
    console.log(`Département sélectionné: ${departmentId}`);
    this.loading = true;
    
    // Charger les niveaux pour ce département
    this.niveauxService.getNiveauxByDepartement(departmentId).subscribe({
      next: (data) => {
        console.log('Niveaux chargés pour le département:', data);
        this.niveaux = data || [];
        this.filteredNiveaux = [...this.niveaux]; // Mettre à jour également les niveaux filtrés
        this.loading = false;
        
        // Mettre à jour le filtre de département sélectionné
        this.selectedDepartmentFilter = departmentId;
        
        // Mettre à jour les compteurs d'étudiants
        this.updateStudentCounts();
      },
      error: (err) => {
        console.error('Erreur lors du chargement des niveaux par département:', err);
        this.showNotification('Erreur lors du chargement des niveaux', true);
        this.loading = false;
      },
    });
  }
}