import {OmniSyncColors} from '../../shared/UI/colors';
import {Task} from './task';

export interface Column {
  id: string;
  header: string;
  color: OmniSyncColors;
  tasks: Task[];
}
