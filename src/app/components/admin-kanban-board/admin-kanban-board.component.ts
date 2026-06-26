import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  TemplateRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import {
  agruparItensKanban,
  KanbanColumnDef,
  KanbanItemMovedEvent,
} from '../../utils/admin-kanban-utils';

@Component({
  selector: 'app-admin-kanban-board',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  templateUrl: './admin-kanban-board.component.html',
  styleUrls: ['./admin-kanban-board.component.scss'],
})
export class AdminKanbanBoardComponent implements OnChanges {
  @Input({ required: true }) columns!: KanbanColumnDef[];
  @Input({ required: true }) items!: any[];
  @Input({ required: true }) resolveStatus!: (item: any) => string;
  @Input({ required: true }) cardTemplate!: TemplateRef<{ $implicit: any }>;
  @Input() emptyMessage = 'Nenhum item para exibir no kanban.';
  @Input() columnEmptyMessage = 'Nenhum item';

  @Output() itemMoved = new EventEmitter<KanbanItemMovedEvent>();

  kanbanBoard: Record<string, any[]> = {};

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['items'] || changes['columns'] || changes['resolveStatus']) {
      this.syncBoard();
    }
  }

  syncBoard(): void {
    this.kanbanBoard = agruparItensKanban(
      this.items ?? [],
      this.columns ?? [],
      this.resolveStatus,
    );
  }

  contarColuna(statusValue: string): number {
    return this.kanbanBoard[statusValue]?.length ?? 0;
  }

  onDrop(event: CdkDragDrop<any[]>, targetStatus: string): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      return;
    }

    const fromStatus = this.statusFromContainer(event.previousContainer.data);
    if (!fromStatus) {
      return;
    }

    const item = event.previousContainer.data[event.previousIndex];
    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex,
    );

    if (fromStatus !== targetStatus) {
      this.itemMoved.emit({ item, fromStatus, toStatus: targetStatus });
    }
  }

  private statusFromContainer(data: any[]): string | null {
    for (const coluna of this.columns) {
      if (this.kanbanBoard[coluna.value] === data) {
        return coluna.value;
      }
    }
    return null;
  }
}
