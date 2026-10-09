def evaluate_treatment_progress(
    previous_damage: float,
    current_damage: float,
    current_medicine: str,
    backup_medicine: str,
    is_classified_healthy: bool = False,
    already_switched: bool = False,
    day_number: int = 3
) -> dict:
    """
    Compares consecutive check-ins (e.g. Day 0 vs Day 3, or Day 3 vs Day 6):
    - If damage is 0% or classified healthy -> RECOVERED (Case complete)
    - If damage is actively increased (by > 2%) -> CRITICAL_WORSENED (Stop loop, consult doctor)
    - If damage is reduced -> WORKING (Continue treatment)
    - If damage is unchanged:
      * Day 3 (first follow-up): Switch from primary to backup medicine! Schedule Day 6 checkup. Loop stays IN_PROGRESS!
      * Day 6 or later (already switched, backup failed): Both primary and backup treatments failed. Stop loop and consult doctor!
    """
    # 1. Recovery condition: 0% damage or classified healthy
    if current_damage <= 0.0 or is_classified_healthy:
        return {
            "status": "RECOVERED",
            "message": "Plant Fully Recovered (0% Damage) — Treatment Complete! 🎉",
            "prescribed_medicine": current_medicine,
            "switch_occurred": False,
            "case_completed": True,
            "stop_loop": False,
            "doctor_consult": False
        }

    # 2. Damage Actively Increased (by > 2.0%) -> Stop loop immediately & consult doctor
    if current_damage > previous_damage + 2.0:
        increase = round(current_damage - previous_damage, 1)
        return {
            "status": "CRITICAL_WORSENED",
            "message": f"Critical Warning: Damage increased by {increase}% ({previous_damage}% → {current_damage}%). Pathogen is spreading aggressively. Please consult the nearest agricultural doctor immediately.",
            "prescribed_medicine": "Emergency Consultation with Nearest Agricultural Doctor",
            "switch_occurred": True,
            "case_completed": False,
            "stop_loop": True,
            "doctor_consult": True
        }

    # 3. Damage reduced -> Medicine is working, normal continue
    if current_damage < previous_damage - 0.5:
        reduction = round(previous_damage - current_damage, 1)
        return {
            "status": "WORKING",
            "message": f"Medicine is working (Damage reduced by {reduction}%: {previous_damage}% → {current_damage}%). Continue treatment schedule.",
            "prescribed_medicine": current_medicine,
            "switch_occurred": False,
            "case_completed": False,
            "stop_loop": False,
            "doctor_consult": False
        }

    # 4. Damage Unchanged (or difference <= 0.5%)
    # ONLY on Day 6 or later AND when backup medicine was already tried (already_switched is True):
    if already_switched and day_number >= 6:
        return {
            "status": "STOPPED_DOCTOR_CONSULT",
            "message": f"Plant is not reacting to medicines. Damage remained unchanged at {current_damage}% across Day 0 to Day {day_number}. Both primary and backup treatments failed to control the infection. Treatment loop ended — please consult the nearest agricultural doctor immediately.",
            "prescribed_medicine": "Emergency Consultation with Nearest Agricultural Doctor",
            "switch_occurred": True,
            "case_completed": False,
            "stop_loop": True,
            "doctor_consult": True
        }

    # On Day 3 (first follow-up checkin): Switch from primary to backup medicine!
    # DO NOT STOP THE LOOP ON DAY 3! Next checkup is Day 6!
    new_medicine = backup_medicine if backup_medicine and backup_medicine != current_medicine else f"Alternative systemic control ({current_medicine} + Bio-stimulant)"
    return {
        "status": "NOT_REACTING",
        "message": f"Plant is not reacting to initial medicine (damage unchanged at {current_damage}%). Switched to backup medicine {new_medicine} for Day 6 checkup.",
        "prescribed_medicine": new_medicine,
        "switch_occurred": True,
        "case_completed": False,
        "stop_loop": False,
        "doctor_consult": False
    }

