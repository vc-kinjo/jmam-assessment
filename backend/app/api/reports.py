from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date, datetime

from ..database.connection import get_db
from ..models.user import User
from ..services.report_service import report_service
from ..utils.auth import get_current_user

router = APIRouter()

@router.get("/reports/projects/{project_id}/progress")
def get_project_progress_report(
    project_id: int,
    report_date: Optional[date] = Query(None, description="レポート基準日 (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """プロジェクト進捗レポートを取得"""
    try:
        report = report_service.generate_project_progress_report(db, project_id, report_date)
        return report
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/reports/projects/{project_id}/progress/pdf")
def export_project_progress_pdf(
    project_id: int,
    report_date: Optional[date] = Query(None, description="レポート基準日 (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """プロジェクト進捗レポートをPDF出力"""
    try:
        pdf_data = report_service.export_project_progress_to_pdf(db, project_id, report_date)
        
        # プロジェクト名を取得してファイル名に使用
        from ..models.project import Project
        project = db.query(Project).filter(Project.id == project_id).first()
        project_name = project.name if project else f"Project_{project_id}"
        
        filename = f"進捗レポート_{project_name}_{datetime.now().strftime('%Y%m%d')}.pdf"
        
        return Response(
            content=pdf_data,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename*=UTF-8''{filename}"}
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF生成エラー: {str(e)}")

@router.get("/reports/projects/{project_id}/tasks/excel")
def export_tasks_excel(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """タスク一覧をExcel出力"""
    try:
        excel_data = report_service.export_tasks_to_excel(db, project_id)
        
        # プロジェクト名を取得してファイル名に使用
        from ..models.project import Project
        project = db.query(Project).filter(Project.id == project_id).first()
        project_name = project.name if project else f"Project_{project_id}"
        
        filename = f"タスク一覧_{project_name}_{datetime.now().strftime('%Y%m%d')}.xlsx"
        
        return Response(
            content=excel_data,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename*=UTF-8''{filename}"}
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Excel生成エラー: {str(e)}")

@router.get("/reports/workload")
def get_user_workload_report(
    start_date: date = Query(..., description="開始日 (YYYY-MM-DD)"),
    end_date: date = Query(..., description="終了日 (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """ユーザー別作業負荷レポートを取得"""
    if current_user.role_level not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="管理者またはプロジェクト管理者権限が必要です")
    
    if start_date > end_date:
        raise HTTPException(status_code=400, detail="開始日は終了日より前である必要があります")
    
    report = report_service.generate_user_workload_report(db, start_date, end_date)
    return report

@router.get("/reports/dashboard-stats")
def get_dashboard_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """ダッシュボード用統計情報を取得"""
    from ..models.project import Project
    from ..models.task import Task
    
    # プロジェクト統計
    total_projects = db.query(Project).count()
    active_projects = db.query(Project).filter(Project.status == "active").count()
    completed_projects = db.query(Project).filter(Project.status == "completed").count()
    
    # タスク統計
    total_tasks = db.query(Task).count()
    completed_tasks = db.query(Task).filter(Task.status == "completed").count()
    overdue_tasks = db.query(Task).filter(
        Task.planned_end_date < datetime.now().date(),
        Task.status != "completed"
    ).count()
    
    # 今月の実績
    current_month_start = datetime.now().replace(day=1).date()
    tasks_completed_this_month = db.query(Task).filter(
        Task.actual_end_date >= current_month_start,
        Task.status == "completed"
    ).count()
    
    projects_completed_this_month = db.query(Project).filter(
        Project.updated_at >= datetime.combine(current_month_start, datetime.min.time()),
        Project.status == "completed"
    ).count()
    
    return {
        "projects": {
            "total": total_projects,
            "active": active_projects,
            "completed": completed_projects,
            "completed_this_month": projects_completed_this_month
        },
        "tasks": {
            "total": total_tasks,
            "completed": completed_tasks,
            "overdue": overdue_tasks,
            "completed_this_month": tasks_completed_this_month,
            "completion_rate": (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
        }
    }

@router.get("/reports/projects/{project_id}/gantt/export")
def export_gantt_chart_image(
    project_id: int,
    format: str = Query("png", regex="^(png|svg|pdf)$", description="出力フォーマット"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """ガントチャートを画像またはPDFで出力"""
    # 注意: 実際のガントチャートの画像生成は複雑なため、
    # ここではプレースホルダーとして基本的な実装を示します
    
    try:
        from ..models.project import Project
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="プロジェクトが見つかりません")
        
        # ここで実際のガントチャート画像生成を行う
        # Pillow, matplotlib, plotlyなどを使用して生成
        
        # プレースホルダーとして空のレスポンスを返す
        return {"message": "ガントチャート出力機能は開発中です", "format": format}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ガントチャート出力エラー: {str(e)}")

@router.post("/reports/email/{report_type}")
def send_report_email(
    report_type: str,
    recipient_emails: list,
    project_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """レポートをメールで送信"""
    if current_user.role_level not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="管理者またはプロジェクト管理者権限が必要です")
    
    # メール送信機能の実装
    # 実際の実装では、バックグラウンドタスクとして処理する
    
    return {
        "message": f"{report_type}レポートのメール送信を開始しました",
        "recipients": recipient_emails,
        "project_id": project_id
    }