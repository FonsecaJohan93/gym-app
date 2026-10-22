"""Genera la biblioteca de ejercicios a partir de free-exercise-db (dominio público).

Uso:
    python3 scripts/build_library.py <ruta a exercises.json>

- Escribe src/data/exercises.json con los ejercicios curados (nombre en español).
- Descarga las 2 imágenes de cada ejercicio a public/ex/<id>/{0,1}.jpg.

Fuente: https://github.com/yuhonas/free-exercise-db (Unlicense).
"""

import json
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
IMG_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/"

# Grupo muscular (lo que usa la app para agrupar y proponer reemplazos)
GROUP_BY_MUSCLE = {
    "chest": "Pecho",
    "lats": "Espalda",
    "middle back": "Espalda",
    "lower back": "Espalda",
    "traps": "Espalda",
    "shoulders": "Hombros",
    "biceps": "Bíceps",
    "triceps": "Tríceps",
    "forearms": "Antebrazos",
    "quadriceps": "Cuádriceps",
    "adductors": "Cuádriceps",
    "hamstrings": "Femorales",
    "glutes": "Glúteos",
    "abductors": "Glúteos",
    "calves": "Pantorrillas",
    "abdominals": "Abdomen",
}

MUSCLE_ES = {
    "chest": "pecho",
    "lats": "dorsales",
    "middle back": "espalda media",
    "lower back": "lumbares",
    "traps": "trapecio",
    "shoulders": "hombros",
    "biceps": "bíceps",
    "triceps": "tríceps",
    "forearms": "antebrazos",
    "quadriceps": "cuádriceps",
    "adductors": "aductores",
    "hamstrings": "femorales",
    "glutes": "glúteos",
    "abductors": "abductores",
    "calves": "pantorrillas",
    "abdominals": "abdomen",
    "neck": "cuello",
}

EQUIPMENT_ES = {
    "machine": "Máquina",
    "dumbbell": "Mancuernas",
    "barbell": "Barra",
    "e-z curl bar": "Barra Z",
    "cable": "Polea",
    "body only": "Peso corporal",
    "kettlebells": "Kettlebell",
    "other": "Otro",
}

# id del dataset -> nombre en español
NAMES = {
    # Pecho
    "Barbell_Bench_Press_-_Medium_Grip": "Press de banca con barra",
    "Barbell_Incline_Bench_Press_-_Medium_Grip": "Press inclinado con barra",
    "Decline_Barbell_Bench_Press": "Press declinado con barra",
    "Dumbbell_Bench_Press": "Press de banca con mancuernas",
    "Incline_Dumbbell_Press": "Press inclinado con mancuernas",
    "Decline_Dumbbell_Bench_Press": "Press declinado con mancuernas",
    "Dumbbell_Flyes": "Aperturas con mancuernas",
    "Incline_Dumbbell_Flyes": "Aperturas inclinadas con mancuernas",
    "Butterfly": "Peck deck (mariposa)",
    "Cable_Crossover": "Cruce de poleas",
    "Low_Cable_Crossover": "Cruce de poleas desde abajo",
    "Leverage_Chest_Press": "Press de pecho en máquina",
    "Leverage_Incline_Chest_Press": "Press inclinado en máquina",
    "Smith_Machine_Bench_Press": "Press de banca en Smith",
    "Smith_Machine_Incline_Bench_Press": "Press inclinado en Smith",
    "Pushups": "Flexiones de pecho",
    "Incline_Push-Up": "Flexiones inclinadas",
    "Dips_-_Chest_Version": "Fondos para pecho",
    "Straight-Arm_Dumbbell_Pullover": "Pullover con mancuerna",
    # Espalda
    "Pullups": "Dominadas",
    "Chin-Up": "Dominadas supinas",
    "Wide-Grip_Lat_Pulldown": "Jalón al pecho agarre ancho",
    "Close-Grip_Front_Lat_Pulldown": "Jalón al pecho agarre cerrado",
    "V-Bar_Pulldown": "Jalón con triángulo",
    "Underhand_Cable_Pulldowns": "Jalón agarre supino",
    "One_Arm_Lat_Pulldown": "Jalón a una mano",
    "Straight-Arm_Pulldown": "Jalón con brazos rectos",
    "Seated_Cable_Rows": "Remo sentado en polea",
    "Seated_One-arm_Cable_Pulley_Rows": "Remo a una mano en polea",
    "Bent_Over_Barbell_Row": "Remo con barra",
    "Reverse_Grip_Bent-Over_Rows": "Remo con barra agarre supino",
    "One-Arm_Dumbbell_Row": "Remo con mancuerna a una mano",
    "Bent_Over_Two-Dumbbell_Row": "Remo inclinado con mancuernas",
    "Dumbbell_Incline_Row": "Remo en banco inclinado",
    "T-Bar_Row_with_Handle": "Remo en T",
    "Lying_T-Bar_Row": "Remo en T con apoyo de pecho",
    "Leverage_High_Row": "Remo alto en máquina",
    "Leverage_Iso_Row": "Remo en máquina",
    "Barbell_Deadlift": "Peso muerto",
    "Hyperextensions_Back_Extensions": "Hiperextensiones lumbares",
    "Stiff_Leg_Barbell_Good_Morning": "Buenos días con barra",
    "Barbell_Shrug": "Encogimientos con barra",
    "Dumbbell_Shrug": "Encogimientos con mancuernas",
    # Hombros
    "Barbell_Shoulder_Press": "Press militar sentado con barra",
    "Standing_Military_Press": "Press militar de pie",
    "Dumbbell_Shoulder_Press": "Press de hombros con mancuernas",
    "Arnold_Dumbbell_Press": "Press Arnold",
    "Machine_Shoulder_Military_Press": "Press de hombros en máquina",
    "Smith_Machine_Overhead_Shoulder_Press": "Press de hombros en Smith",
    "Side_Lateral_Raise": "Elevaciones laterales",
    "Cable_Seated_Lateral_Raise": "Elevaciones laterales en polea",
    "Front_Dumbbell_Raise": "Elevaciones frontales con mancuerna",
    "Front_Cable_Raise": "Elevaciones frontales en polea",
    "Reverse_Flyes": "Pájaros con mancuernas",
    "Seated_Bent-Over_Rear_Delt_Raise": "Pájaros sentado",
    "Reverse_Machine_Flyes": "Peck deck invertido",
    "Cable_Rear_Delt_Fly": "Aperturas posteriores en polea",
    "Face_Pull": "Face pull",
    "Upright_Barbell_Row": "Remo al mentón con barra",
    # Bíceps
    "Barbell_Curl": "Curl con barra",
    "EZ-Bar_Curl": "Curl con barra Z",
    "Dumbbell_Bicep_Curl": "Curl con mancuernas",
    "Dumbbell_Alternate_Bicep_Curl": "Curl alterno con mancuernas",
    "Hammer_Curls": "Curl martillo",
    "Cable_Hammer_Curls_-_Rope_Attachment": "Curl martillo en polea con cuerda",
    "Incline_Dumbbell_Curl": "Curl inclinado con mancuernas",
    "Concentration_Curls": "Curl concentrado",
    "Preacher_Curl": "Curl predicador con barra",
    "Machine_Preacher_Curls": "Curl predicador en máquina",
    "Machine_Bicep_Curl": "Curl de bíceps en máquina",
    "Standing_Biceps_Cable_Curl": "Curl de bíceps en polea",
    "Spider_Curl": "Curl araña",
    "Zottman_Curl": "Curl Zottman",
    # Tríceps
    "Triceps_Pushdown": "Extensión de tríceps en polea",
    "Triceps_Pushdown_-_Rope_Attachment": "Extensión de tríceps con cuerda",
    "Reverse_Grip_Triceps_Pushdown": "Extensión de tríceps agarre supino",
    "Triceps_Overhead_Extension_with_Rope": "Extensión de tríceps tras nuca con cuerda",
    "Cable_One_Arm_Tricep_Extension": "Extensión de tríceps a una mano en polea",
    "EZ-Bar_Skullcrusher": "Rompecráneos con barra Z",
    "Lying_Dumbbell_Tricep_Extension": "Extensión de tríceps acostado con mancuernas",
    "Standing_Dumbbell_Triceps_Extension": "Press francés de pie con mancuerna",
    "Tricep_Dumbbell_Kickback": "Patada de tríceps",
    "Close-Grip_Barbell_Bench_Press": "Press de banca agarre cerrado",
    "Dips_-_Triceps_Version": "Fondos en paralelas",
    "Bench_Dips": "Fondos en banco",
    "Dip_Machine": "Fondos en máquina",
    "Machine_Triceps_Extension": "Extensión de tríceps en máquina",
    # Antebrazos
    "Palms-Up_Dumbbell_Wrist_Curl_Over_A_Bench": "Curl de muñeca con mancuerna",
    "Palms-Down_Wrist_Curl_Over_A_Bench": "Curl de muñeca inverso con barra",
    "Reverse_Barbell_Curl": "Curl inverso con barra",
    "Farmers_Walk": "Paseo del granjero",
    # Cuádriceps
    "Barbell_Squat": "Sentadilla con barra",
    "Barbell_Full_Squat": "Sentadilla profunda con barra",
    "Front_Barbell_Squat": "Sentadilla frontal",
    "Smith_Machine_Squat": "Sentadilla en Smith",
    "Goblet_Squat": "Sentadilla goblet",
    "Hack_Squat": "Sentadilla hack",
    "Leg_Press": "Prensa de piernas",
    "Narrow_Stance_Leg_Press": "Prensa con pies juntos",
    "Leg_Extensions": "Extensión de cuádriceps",
    "Single-Leg_Leg_Extension": "Extensión de cuádriceps a una pierna",
    "Dumbbell_Lunges": "Zancadas con mancuernas",
    "Barbell_Walking_Lunge": "Zancadas caminando con barra",
    "Dumbbell_Rear_Lunge": "Zancada hacia atrás con mancuernas",
    "Split_Squat_with_Dumbbells": "Sentadilla split con mancuernas",
    "Dumbbell_Step_Ups": "Subidas al cajón con mancuernas",
    "Bodyweight_Squat": "Sentadilla sin peso",
    "Plie_Dumbbell_Squat": "Sentadilla sumo con mancuerna",
    "Thigh_Adductor": "Aductores en máquina",
    # Femorales
    "Lying_Leg_Curls": "Curl femoral acostado",
    "Seated_Leg_Curl": "Curl femoral sentado",
    "Standing_Leg_Curl": "Curl femoral de pie",
    "Romanian_Deadlift": "Peso muerto rumano",
    "Stiff-Legged_Barbell_Deadlift": "Peso muerto piernas rígidas",
    "Stiff-Legged_Dumbbell_Deadlift": "Peso muerto rumano con mancuernas",
    "Sumo_Deadlift": "Peso muerto sumo",
    "Good_Morning": "Buenos días",
    "Natural_Glute_Ham_Raise": "Curl nórdico",
    # Glúteos
    "Barbell_Hip_Thrust": "Hip thrust con barra",
    "Barbell_Glute_Bridge": "Puente de glúteos con barra",
    "Butt_Lift_Bridge": "Puente de glúteos",
    "Single_Leg_Glute_Bridge": "Puente de glúteo a una pierna",
    "One-Legged_Cable_Kickback": "Patada de glúteo en polea",
    "Glute_Kickback": "Patada de glúteo en el suelo",
    "Pull_Through": "Pull through en polea",
    "Thigh_Abductor": "Abductores en máquina",
    # Pantorrillas
    "Standing_Calf_Raises": "Elevación de talones de pie en máquina",
    "Seated_Calf_Raise": "Elevación de talones sentado",
    "Calf_Press_On_The_Leg_Press_Machine": "Pantorrillas en prensa",
    "Standing_Dumbbell_Calf_Raise": "Elevación de talones con mancuernas",
    "Smith_Machine_Calf_Raise": "Elevación de talones en Smith",
    # Abdomen
    "Crunches": "Abdominales (crunch)",
    "Cable_Crunch": "Crunch en polea",
    "Ab_Crunch_Machine": "Crunch en máquina",
    "Decline_Crunch": "Crunch declinado",
    "Reverse_Crunch": "Crunch inverso",
    "Oblique_Crunches": "Crunch oblicuo",
    "Hanging_Leg_Raise": "Elevación de piernas colgado",
    "Flat_Bench_Lying_Leg_Raise": "Elevación de piernas en banco",
    "Plank": "Plancha",
    "Side_Bridge": "Plancha lateral",
    "Russian_Twist": "Giros rusos",
    "Dead_Bug": "Dead bug",
    "Air_Bike": "Bicicleta abdominal",
    "Barbell_Ab_Rollout_-_On_Knees": "Rueda abdominal de rodillas",
    "Standing_Cable_Wood_Chop": "Leñador en polea",
    "Pallof_Press": "Press Pallof",
}

# Ajustes manuales donde el músculo principal del dataset no es el grupo natural
GROUP_OVERRIDE = {
    "Farmers_Walk": "Antebrazos",
    "Reverse_Barbell_Curl": "Antebrazos",
    "Good_Morning": "Femorales",
}


def main() -> None:
    src = json.load(open(sys.argv[1]))
    by_id = {e["id"]: e for e in src}
    missing = [i for i in NAMES if i not in by_id]
    if missing:
        sys.exit(f"IDs no encontrados: {missing}")

    out = []
    for ex_id, es in NAMES.items():
        e = by_id[ex_id]
        primary = e["primaryMuscles"][0]
        out.append({
            "id": ex_id,
            "es": es,
            "en": e["name"],
            "group": GROUP_OVERRIDE.get(ex_id, GROUP_BY_MUSCLE[primary]),
            "muscles": [MUSCLE_ES.get(m, m) for m in e["primaryMuscles"]],
            "secondary": [MUSCLE_ES.get(m, m) for m in e["secondaryMuscles"]],
            "equipment": EQUIPMENT_ES.get(e["equipment"] or "other", "Otro"),
            "level": e["level"],
        })
        for n in (0, 1):
            dest = ROOT / "public" / "ex" / ex_id / f"{n}.jpg"
            if dest.exists():
                continue
            dest.parent.mkdir(parents=True, exist_ok=True)
            urllib.request.urlretrieve(f"{IMG_BASE}{ex_id}/{n}.jpg", dest)

    data_dir = ROOT / "src" / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    json.dump(out, open(data_dir / "exercises.json", "w"), ensure_ascii=False, indent=1)
    print(f"{len(out)} ejercicios")


if __name__ == "__main__":
    main()
