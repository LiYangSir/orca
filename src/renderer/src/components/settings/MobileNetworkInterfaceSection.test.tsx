// @vitest-environment happy-dom

import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MobileNetworkInterfaceSection } from './MobileNetworkInterfaceSection'
import type { MobileNetworkInterface } from './mobile-network-interface-selection'
import { TooltipProvider } from '../ui/tooltip'

vi.mock('../mobile/NetworkInterfacePicker', () => ({
  NetworkInterfacePicker: ({
    networkInterfaces,
    selectedAddress,
    onSelectedAddressChange
  }: {
    networkInterfaces: readonly MobileNetworkInterface[]
    selectedAddress: string | undefined
    onSelectedAddressChange: (address: string) => void
  }) => {
    const [dialogOpen, setDialogOpen] = React.useState(false)
    const [customAddress, setCustomAddress] = React.useState('')
    const selectedInterface = networkInterfaces.find((iface) => iface.address === selectedAddress)
    const triggerLabel = selectedInterface
      ? `${selectedInterface.address} (${selectedInterface.name})`
      : selectedAddress
        ? `${selectedAddress} (custom)`
        : 'No interfaces found'
    const isValidCustomAddress =
      /^\d{1,3}(?:\.\d{1,3}){3}$/.test(customAddress) || customAddress.endsWith('.ts.net')

    return (
      <div>
        <button type="button" role="combobox">
          {triggerLabel}
        </button>
        {networkInterfaces.map((iface) => (
          <button
            key={iface.address}
            type="button"
            role="option"
            onClick={() => onSelectedAddressChange(iface.address)}
          >
            {iface.address} ({iface.name})
          </button>
        ))}
        <button type="button" role="option" onClick={() => setDialogOpen(true)}>
          Add custom address
        </button>
        {dialogOpen ? (
          <div role="dialog" aria-label="Custom network address">
            <label>
              Address
              <input
                aria-label="Address"
                value={customAddress}
                onInput={(event) =>
                  setCustomAddress((event.target as HTMLInputElement).value)
                }
              />
            </label>
            <button type="button" onClick={() => setDialogOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              disabled={!isValidCustomAddress}
              onClick={() => {
                if (!isValidCustomAddress) {
                  return
                }
                onSelectedAddressChange(customAddress)
                setDialogOpen(false)
              }}
            >
              Use address
            </button>
          </div>
        ) : null}
      </div>
    )
  }
}))

let container: HTMLDivElement
let root: Root

const LAN: MobileNetworkInterface = { name: 'en0', address: '192.168.1.24' }
const TAILNET: MobileNetworkInterface = { name: 'tailscale0', address: '100.64.1.20' }

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
})

function renderSection(
  overrides: Partial<React.ComponentProps<typeof MobileNetworkInterfaceSection>> = {}
) {
  const onSelectedAddressChange = vi.fn()
  const onRefreshNetworkInterfaces = vi.fn()
  const onGenerateQr = vi.fn()
  const props: React.ComponentProps<typeof MobileNetworkInterfaceSection> = {
    networkInterfaces: [LAN, TAILNET],
    selectedAddress: TAILNET.address,
    onSelectedAddressChange,
    refreshingNetworkInterfaces: false,
    onRefreshNetworkInterfaces,
    loading: false,
    hasQrCode: false,
    onGenerateQr,
    ...overrides
  }

  act(() => {
    root.render(
      <TooltipProvider>
        <MobileNetworkInterfaceSection {...props} />
      </TooltipProvider>
    )
  })

  return { onSelectedAddressChange, onRefreshNetworkInterfaces, onGenerateQr }
}

function getButtonByText(label: string | RegExp): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll('button')).find((candidate) => {
    const text = candidate.textContent?.trim() ?? ''
    return typeof label === 'string' ? text === label : label.test(text)
  })
  expect(button).toBeTruthy()
  return button as HTMLButtonElement
}

function clickButton(label: string | RegExp): void {
  act(() => {
    getButtonByText(label).dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

function typeIntoAddressInput(value: string): void {
  const input = container.querySelector<HTMLInputElement>('input[aria-label="Address"]')
  expect(input).toBeTruthy()
  act(() => {
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    setValue?.call(input, value)
    input?.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('MobileNetworkInterfaceSection', () => {
  it('renders the trigger with the currently selected address', () => {
    renderSection()
    expect(container.textContent).toContain('100.64.1.20 (tailscale0)')
  })

  it('renders the (custom) label on the trigger when the selection is a manual address', () => {
    renderSection({ selectedAddress: 'my-mac.tail-abcd.ts.net' })
    expect(container.textContent).toContain('my-mac.tail-abcd.ts.net (custom)')
  })

  it('commits an OS interface picked from the list', () => {
    const { onSelectedAddressChange } = renderSection()
    clickButton('192.168.1.24 (en0)')
    expect(onSelectedAddressChange).toHaveBeenCalledWith('192.168.1.24')
  })

  it('opens the custom-address dialog from the Add custom address row', () => {
    renderSection()
    clickButton(/Add custom address/i)
    expect(container.querySelector('[role="dialog"]')).toBeTruthy()
    expect(container.querySelector('input[aria-label="Address"]')).toBeTruthy()
  })

  it('confirms a valid custom address typed into the dialog', () => {
    const { onSelectedAddressChange } = renderSection()
    clickButton(/Add custom address/i)
    typeIntoAddressInput('my-mac.tail-abcd.ts.net')
    clickButton(/Use address/i)
    expect(onSelectedAddressChange).toHaveBeenCalledWith('my-mac.tail-abcd.ts.net')
  })

  it('disables the confirm button while the typed address is invalid', () => {
    const { onSelectedAddressChange } = renderSection()
    clickButton(/Add custom address/i)
    typeIntoAddressInput('not an address')
    const confirmButton = getButtonByText(/Use address/i)
    expect(confirmButton.disabled).toBe(true)
    clickButton(/Use address/i)
    expect(onSelectedAddressChange).not.toHaveBeenCalled()
  })

  it('shows No interfaces found when the list is empty', () => {
    renderSection({ networkInterfaces: [], selectedAddress: undefined })
    expect(container.textContent).toContain('No interfaces found')
  })
})
